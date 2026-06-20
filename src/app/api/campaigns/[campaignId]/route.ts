import { NextResponse } from "next/server";
import { z } from "zod";

import { publicCampaign } from "@/lib/campaigns";
import { prisma } from "@/lib/db";
import { extractBearerToken, generateApiKey, hashApiKey } from "@/lib/security";

const CampaignPatchSchema = z.object({
  action: z.enum(["rotate-api-key", "disable", "enable"]),
});

type RouteContext = {
  params: Promise<{
    campaignId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { campaignId } = await context.params;
  const campaign = await prisma.campaign.findUnique({
    include: {
      registrations: {
        orderBy: { registeredAt: "desc" },
      },
    },
    where: { campaignId },
  });

  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  return NextResponse.json({
    campaign: publicCampaign(campaign),
    registrations: campaign.registrations.map((registration) => ({
      capsuleId: registration.capsuleId,
      morphWallet: registration.morphWallet,
      nullifier: registration.nullifier,
      registeredAt: registration.registeredAt.toISOString(),
      tier: registration.tier,
      tierLabel: registration.tierLabel,
    })),
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { campaignId } = await context.params;
  const parsed = CampaignPatchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const campaign = await prisma.campaign.findUnique({ where: { campaignId } });
  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  const bearer = extractBearerToken(request.headers.get("authorization"));
  if (!bearer || hashApiKey(bearer) !== campaign.apiKeyHash) {
    return NextResponse.json({ error: "Invalid campaign API key" }, { status: 401 });
  }

  if (parsed.data.action === "rotate-api-key") {
    const apiKey = generateApiKey();
    const updated = await prisma.campaign.update({
      data: { apiKeyHash: hashApiKey(apiKey) },
      where: { campaignId },
    });

    return NextResponse.json({
      apiKey,
      campaign: publicCampaign(updated),
    });
  }

  const updated = await prisma.campaign.update({
    data: { enabled: parsed.data.action === "enable" },
    where: { campaignId },
  });

  return NextResponse.json({
    campaign: publicCampaign(updated),
  });
}
