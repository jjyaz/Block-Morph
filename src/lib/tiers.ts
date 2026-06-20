import type { TierLabel } from "@blockmorph/sdk";
import { TIER_LABELS } from "@blockmorph/sdk";

export type WalletMetrics = {
  walletPublicKey: string;
  balanceSol: number;
  firstSeenAt: string | null;
  walletAgeDays: number;
  txCountEstimate: number;
  recentActivityCount: number;
  estimatedVisibleSolMovement90d: number;
  fetchedSignatureCount: number;
  capped: boolean;
};

export type TierResult = {
  tier: number;
  tierLabel: TierLabel;
};

export const DEFAULT_TIER_RULES = [
  {
    tier: 4,
    tierLabel: "OBSIDIAN" as const,
    minWalletAgeDays: 365,
    minTxCount: 250,
    minVolume90dSol: 100,
  },
  {
    tier: 3,
    tierLabel: "GOLD" as const,
    minWalletAgeDays: 180,
    minTxCount: 100,
    minVolume90dSol: 25,
  },
  {
    tier: 2,
    tierLabel: "SILVER" as const,
    minWalletAgeDays: 90,
    minTxCount: 50,
    minSolBalance: 0.5,
    minVolume90dSol: 5,
  },
  {
    tier: 1,
    tierLabel: "BRONZE" as const,
    minWalletAgeDays: 30,
    minTxCount: 10,
  },
];

export function determineTier(metrics: WalletMetrics): TierResult {
  for (const rule of DEFAULT_TIER_RULES) {
    const ageOk = metrics.walletAgeDays >= rule.minWalletAgeDays;
    const txOk = metrics.txCountEstimate >= rule.minTxCount;
    const volumeOk =
      "minVolume90dSol" in rule
        ? metrics.estimatedVisibleSolMovement90d >= (rule.minVolume90dSol ?? 0)
        : true;
    const balanceOrVolumeOk =
      rule.tier === 2
        ? metrics.balanceSol >= (rule.minSolBalance ?? 0) ||
          metrics.estimatedVisibleSolMovement90d >= (rule.minVolume90dSol ?? 0)
        : volumeOk;

    if (ageOk && txOk && balanceOrVolumeOk) {
      return {
        tier: rule.tier,
        tierLabel: rule.tierLabel,
      };
    }
  }

  return {
    tier: 1,
    tierLabel: TIER_LABELS[0],
  };
}

export function tierLabelFor(tier: number): TierLabel {
  return TIER_LABELS[Math.max(1, Math.min(4, tier)) - 1];
}

export function meetsCampaignMinimums(
  metrics: WalletMetrics,
  campaign: {
    minWalletAgeDays: number;
    minTxCount: number;
    minSolBalance: number;
    minVolume90dSol: number;
  },
) {
  return (
    metrics.walletAgeDays >= campaign.minWalletAgeDays &&
    metrics.txCountEstimate >= campaign.minTxCount &&
    metrics.balanceSol >= campaign.minSolBalance &&
    metrics.estimatedVisibleSolMovement90d >= campaign.minVolume90dSol
  );
}
