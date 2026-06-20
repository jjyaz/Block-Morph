import { NextResponse } from "next/server";

import { campaignPolicyHash, publicCampaign } from "@/lib/campaigns";
import { prisma } from "@/lib/db";
import { CampaignCreateSchema } from "@/lib/schemas";
import { generateApiKey, hashApiKey } from "@/lib/security";

export async function GET() {
  const campaigns = await prisma.campaign.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({
    campaigns: campaigns.map(publicCampaign),
  });
}

export async function POST(request: Request) {
  const parsed = CampaignCreateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const apiKey = generateApiKey();
  const expiresAt = new Date(data.expiresAt);
  const policyHash = campaignPolicyHash({
    allowedTiers: data.allowedTiers,
    campaignId: data.campaignId,
    expiresAt,
    maxRegistrations: data.maxRegistrations ?? null,
    minSolBalance: data.minSolBalance,
    minTxCount: data.minTxCount,
    minVolume90dSol: data.minVolume90dSol,
    minWalletAgeDays: data.minWalletAgeDays,
  });

  try {
    const campaign = await prisma.campaign.create({
      data: {
        allowedTiersJson: JSON.stringify(data.allowedTiers),
        apiKeyHash: hashApiKey(apiKey),
        campaignId: data.campaignId,
        expiresAt,
        maxRegistrations: data.maxRegistrations ?? null,
        minSolBalance: data.minSolBalance,
        minTxCount: data.minTxCount,
        minVolume90dSol: data.minVolume90dSol,
        minWalletAgeDays: data.minWalletAgeDays,
        name: data.name,
        policyHash,
        webhookUrl: data.webhookUrl || null,
      },
    });

    return NextResponse.json(
      {
        apiKey,
        campaign: publicCampaign(campaign),
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Campaign could not be created",
      },
      { status: 409 },
    );
  }
}
