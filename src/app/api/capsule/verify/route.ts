import { NextResponse } from "next/server";
import { verifyCapsule } from "@blockmorph/sdk";

import { campaignPolicyHashFromRecord, publicCampaign } from "@/lib/campaigns";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { CapsuleVerifySchema } from "@/lib/schemas";

export async function POST(request: Request) {
  const parsed = CapsuleVerifySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten(), valid: false }, { status: 400 });
  }

  const campaign = await prisma.campaign.findUnique({
    where: { campaignId: parsed.data.capsule.campaignId },
  });
  const issuedCapsule = await prisma.issuedCapsule.findUnique({
    where: { capsuleId: parsed.data.capsule.capsuleId },
  });
  const expectedPolicyHash = campaign ? campaignPolicyHashFromRecord(campaign) : undefined;
  const result = verifyCapsule(parsed.data.capsule, {
    expectedPolicyHash,
    issuerPublicKey: env.BLOCKMORPH_ISSUER_PUBLIC_KEY,
    minTier: parsed.data.minTier,
  });
  const reasons = [...result.reasons];

  if (!campaign) {
    reasons.push("Campaign does not exist");
  } else if (!campaign.enabled) {
    reasons.push("Campaign is disabled");
  } else if (campaign.expiresAt.getTime() <= Date.now()) {
    reasons.push("Campaign is expired");
  }

  if (issuedCapsule?.revokedAt) {
    reasons.push(`Capsule was revoked at ${issuedCapsule.revokedAt.toISOString()}`);
  }

  return NextResponse.json({
    campaign: campaign ? publicCampaign(campaign) : null,
    capsule: result.capsule,
    revokedAt: issuedCapsule?.revokedAt?.toISOString() ?? null,
    reasons,
    valid: result.valid && reasons.length === 0,
  });
}
