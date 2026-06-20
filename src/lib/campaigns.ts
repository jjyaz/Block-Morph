import type { Campaign } from "@prisma/client";
import { createPolicyHash } from "@blockmorph/sdk";

export type CampaignPolicyInput = {
  campaignId: string;
  minWalletAgeDays: number;
  minTxCount: number;
  minSolBalance: number;
  minVolume90dSol: number;
  allowedTiers: number[];
  maxRegistrations?: number | null;
  expiresAt: Date | string;
};

export function parseAllowedTiers(value: string | null | undefined): number[] {
  if (!value) {
    return [1, 2, 3, 4];
  }

  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return [1, 2, 3, 4];
    }

    return parsed
      .map((tier) => Number(tier))
      .filter((tier) => Number.isInteger(tier) && tier >= 1 && tier <= 4);
  } catch {
    return [1, 2, 3, 4];
  }
}

export function campaignPolicyHash(input: CampaignPolicyInput) {
  return createPolicyHash({
    allowedTiers: input.allowedTiers,
    campaignId: input.campaignId,
    expiresAt: input.expiresAt,
    maxRegistrations: input.maxRegistrations ?? null,
    minSolBalance: input.minSolBalance,
    minTxCount: input.minTxCount,
    minVolume90dSol: input.minVolume90dSol,
    minWalletAgeDays: input.minWalletAgeDays,
  });
}

export function campaignPolicyHashFromRecord(campaign: Campaign) {
  return campaignPolicyHash({
    allowedTiers: parseAllowedTiers(campaign.allowedTiersJson),
    campaignId: campaign.campaignId,
    expiresAt: campaign.expiresAt,
    maxRegistrations: campaign.maxRegistrations,
    minSolBalance: campaign.minSolBalance,
    minTxCount: campaign.minTxCount,
    minVolume90dSol: campaign.minVolume90dSol,
    minWalletAgeDays: campaign.minWalletAgeDays,
  });
}

export function publicCampaign(campaign: Campaign) {
  return {
    allowedTiers: parseAllowedTiers(campaign.allowedTiersJson),
    campaignId: campaign.campaignId,
    createdAt: campaign.createdAt.toISOString(),
    enabled: campaign.enabled,
    expiresAt: campaign.expiresAt.toISOString(),
    id: campaign.id,
    maxRegistrations: campaign.maxRegistrations,
    minSolBalance: campaign.minSolBalance,
    minTxCount: campaign.minTxCount,
    minVolume90dSol: campaign.minVolume90dSol,
    minWalletAgeDays: campaign.minWalletAgeDays,
    name: campaign.name,
    policyHash: campaign.policyHash,
    webhookUrl: campaign.webhookUrl,
  };
}
