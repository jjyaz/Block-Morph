import { NextResponse } from "next/server";
import { verifyCapsule } from "@blockmorph/sdk";

import { campaignPolicyHashFromRecord } from "@/lib/campaigns";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { CapsuleRevokeSchema } from "@/lib/schemas";

export async function POST(request: Request) {
  const parsed = CapsuleRevokeSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const capsule = parsed.data.capsule;
  const campaign = await prisma.campaign.findUnique({
    where: { campaignId: capsule.campaignId },
  });
  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  const verification = verifyCapsule(capsule, {
    expectedCampaignId: campaign.campaignId,
    expectedPolicyHash: campaignPolicyHashFromRecord(campaign),
    issuerPublicKey: env.BLOCKMORPH_ISSUER_PUBLIC_KEY,
  });
  if (!verification.valid) {
    return NextResponse.json(
      {
        error: "Capsule cannot be revoked because it is invalid",
        reasons: verification.reasons,
      },
      { status: 422 },
    );
  }

  const issuedCapsule = await prisma.issuedCapsule.findUnique({
    where: { capsuleId: capsule.capsuleId },
  });
  if (!issuedCapsule || issuedCapsule.nullifier !== capsule.nullifier) {
    return NextResponse.json({ error: "Issued capsule record not found" }, { status: 404 });
  }

  const revokedAt = issuedCapsule.revokedAt ?? new Date();
  await prisma.$transaction([
    prisma.issuedCapsule.update({
      data: { revokedAt },
      where: { capsuleId: capsule.capsuleId },
    }),
    prisma.registration.deleteMany({
      where: {
        campaignId: capsule.campaignId,
        nullifier: capsule.nullifier,
      },
    }),
  ]);

  return NextResponse.json({
    capsuleId: capsule.capsuleId,
    deletedRegistrations: true,
    nullifier: capsule.nullifier,
    revoked: true,
    revokedAt: revokedAt.toISOString(),
  });
}
