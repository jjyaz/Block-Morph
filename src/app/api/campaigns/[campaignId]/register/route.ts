import { NextResponse } from "next/server";
import { verifyCapsule } from "@blockmorph/sdk";

import { campaignPolicyHashFromRecord, publicCampaign } from "@/lib/campaigns";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { RegisterSchema } from "@/lib/schemas";

type RouteContext = {
  params: Promise<{
    campaignId: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { campaignId } = await context.params;
  const parsed = RegisterSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const campaign = await prisma.campaign.findUnique({
    include: { _count: { select: { registrations: true } } },
    where: { campaignId },
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

  const capsule = parsed.data.capsule;
  const verification = verifyCapsule(capsule, {
    expectedCampaignId: campaignId,
    expectedPolicyHash: campaignPolicyHashFromRecord(campaign),
    issuerPublicKey: env.BLOCKMORPH_ISSUER_PUBLIC_KEY,
  });

  if (!verification.valid) {
    return NextResponse.json(
      {
        error: "Capsule is invalid",
        reasons: verification.reasons,
      },
      { status: 422 },
    );
  }

  try {
    const registration = await prisma.registration.create({
      data: {
        campaignId,
        capsuleId: capsule.capsuleId,
        morphWallet: capsule.morphWallet,
        nullifier: capsule.nullifier,
        tier: capsule.tier,
        tierLabel: capsule.tierLabel,
      },
    });

    await sendRegistrationWebhook(campaign.webhookUrl, {
      campaignId,
      capsuleId: capsule.capsuleId,
      morphWallet: capsule.morphWallet,
      nullifier: capsule.nullifier,
      tier: capsule.tier,
      tierLabel: capsule.tierLabel,
    });

    return NextResponse.json({
      campaign: publicCampaign(campaign),
      capsuleId: capsule.capsuleId,
      registered: true,
      registrationId: registration.id,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Registration already exists",
      },
      { status: 409 },
    );
  }
}

async function sendRegistrationWebhook(
  webhookUrl: string | null,
  payload: {
    campaignId: string;
    capsuleId: string;
    morphWallet: string;
    nullifier: string;
    tier: number;
    tierLabel: string;
  },
) {
  if (!webhookUrl) {
    return;
  }

  let status = "pending";
  try {
    const response = await fetch(webhookUrl, {
      body: JSON.stringify({
        eventType: "registration.created",
        payload,
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    status = response.ok ? "sent" : `failed:${response.status}`;
  } catch (error) {
    status = `failed:${error instanceof Error ? error.message : "unknown"}`;
  }

  await prisma.webhookEvent.create({
    data: {
      campaignId: payload.campaignId,
      eventType: "registration.created",
      payloadJson: JSON.stringify(payload),
      status,
    },
  });
}
