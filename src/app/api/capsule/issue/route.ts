import { NextResponse } from "next/server";
import { CAPSULE_VERSION, POLICY_VERSION, signCapsule, isValidSolanaAddress, type BlockMorphCapsule } from "@blockmorph/sdk";
import bs58 from "bs58";

import { campaignPolicyHashFromRecord, parseAllowedTiers } from "@/lib/campaigns";
import { prisma } from "@/lib/db";
import { requireIssuerEnv, requireNullifierPepper } from "@/lib/env";
import { CapsuleIssueSchema } from "@/lib/schemas";
import { createNullifier, verifyWalletSignature } from "@/lib/security";
import { fetchWalletMetrics } from "@/lib/solanaMetrics";
import { determineTier, meetsCampaignMinimums } from "@/lib/tiers";

const CHALLENGE_PREFIX = "BlockMorph verification challenge: ";

export async function POST(request: Request) {
  const parsed = CapsuleIssueSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (
    !isValidSolanaAddress(parsed.data.walletPublicKey) ||
    !isValidSolanaAddress(parsed.data.morphWallet)
  ) {
    return NextResponse.json({ error: "Invalid Solana wallet address" }, { status: 400 });
  }

  const issuer = requireIssuerEnv();
  const pepper = requireNullifierPepper();
  const nonce = parsed.data.challenge.startsWith(CHALLENGE_PREFIX)
    ? parsed.data.challenge.slice(CHALLENGE_PREFIX.length)
    : "";

  const nonceRecord = await prisma.challengeNonce.findUnique({ where: { nonce } });
  if (!nonceRecord || nonceRecord.usedAt || nonceRecord.expiresAt.getTime() <= Date.now()) {
    return NextResponse.json({ error: "Challenge nonce is invalid, expired, or already used" }, { status: 409 });
  }

  if (!verifyWalletSignature(parsed.data)) {
    return NextResponse.json({ error: "Wallet signature is invalid" }, { status: 401 });
  }

  const campaign = await prisma.campaign.findUnique({
    include: { _count: { select: { registrations: true } } },
    where: { campaignId: parsed.data.campaignId },
  });

  if (!campaign || !campaign.enabled) {
    return NextResponse.json({ error: "Campaign not found or disabled" }, { status: 404 });
  }

  if (campaign.expiresAt.getTime() <= Date.now()) {
    return NextResponse.json({ error: "Campaign is expired" }, { status: 410 });
  }

  if (
    campaign.maxRegistrations !== null &&
    campaign._count.registrations >= campaign.maxRegistrations
  ) {
    return NextResponse.json({ error: "Campaign registration cap reached" }, { status: 409 });
  }

  const nullifier = createNullifier(parsed.data.walletPublicKey, parsed.data.campaignId, pepper);
  const existing = await prisma.issuedCapsule.findUnique({
    where: {
      campaignId_nullifier: {
        campaignId: parsed.data.campaignId,
        nullifier,
      },
    },
  });
  if (existing) {
    return NextResponse.json({ error: "This proving wallet already has a capsule for the campaign" }, { status: 409 });
  }

  const metrics = await fetchWalletMetrics(parsed.data.walletPublicKey);
  const tier = determineTier(metrics);
  const allowedTiers = parseAllowedTiers(campaign.allowedTiersJson);
  const policyHash = campaignPolicyHashFromRecord(campaign);

  if (!meetsCampaignMinimums(metrics, campaign) || !allowedTiers.includes(tier.tier)) {
    await prisma.challengeNonce.update({
      data: { usedAt: new Date(), wallet: parsed.data.walletPublicKey },
      where: { nonce },
    });

    return NextResponse.json(
      {
        eligible: false,
        error: "Wallet metrics do not satisfy this campaign policy",
        metrics,
        tier,
      },
      { status: 403 },
    );
  }

  const issuedAt = new Date();
  const expiresAt = new Date(Math.min(campaign.expiresAt.getTime(), issuedAt.getTime() + 30 * 24 * 60 * 60 * 1000));
  const capsuleId = crypto.randomUUID();
  const unsignedCapsule = {
    campaignId: campaign.campaignId,
    capsuleId,
    expiresAt: expiresAt.toISOString(),
    issuedAt: issuedAt.toISOString(),
    issuer: "BlockMorph",
    issuerPublicKey: issuer.issuerPublicKey,
    morphWallet: parsed.data.morphWallet,
    nullifier,
    policyHash,
    policyVersion: POLICY_VERSION,
    proofMode: "issuer-signed" as const,
    tier: tier.tier,
    tierLabel: tier.tierLabel,
    type: CAPSULE_VERSION,
  } satisfies Omit<BlockMorphCapsule, "signature">;
  const capsule = signCapsule(unsignedCapsule, bs58.decode(issuer.issuerSecretKey));

  await prisma.$transaction([
    prisma.challengeNonce.update({
      data: { usedAt: new Date(), wallet: parsed.data.walletPublicKey },
      where: { nonce },
    }),
    prisma.issuedCapsule.create({
      data: {
        campaignId: campaign.campaignId,
        capsuleId,
        expiresAt,
        morphWallet: parsed.data.morphWallet,
        nullifier,
        tier: tier.tier,
        tierLabel: tier.tierLabel,
      },
    }),
  ]);

  return NextResponse.json({
    capsule,
    eligible: true,
    metrics,
    privacyNotice:
      "Partners never see your proving wallet. They only see your Morph Wallet, tier, campaign scope, and capsule validity.",
  });
}
