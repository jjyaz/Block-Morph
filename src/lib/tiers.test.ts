import { describe, expect, it } from "vitest";

import { determineTier, meetsCampaignMinimums, type WalletMetrics } from "@/lib/tiers";

const baseMetrics: WalletMetrics = {
  balanceSol: 1,
  capped: false,
  estimatedVisibleSolMovement90d: 10,
  fetchedSignatureCount: 60,
  firstSeenAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString(),
  recentActivityCount: 5,
  txCountEstimate: 60,
  walletAgeDays: 100,
  walletPublicKey: "wallet",
};

describe("tier and campaign policy checks", () => {
  it("determines SILVER for default threshold metrics", () => {
    expect(determineTier(baseMetrics)).toEqual({
      tier: 2,
      tierLabel: "SILVER",
    });
  });

  it("enforces campaign minimum thresholds", () => {
    expect(
      meetsCampaignMinimums(baseMetrics, {
        minSolBalance: 0.5,
        minTxCount: 50,
        minVolume90dSol: 5,
        minWalletAgeDays: 90,
      }),
    ).toBe(true);

    expect(
      meetsCampaignMinimums(baseMetrics, {
        minSolBalance: 2,
        minTxCount: 50,
        minVolume90dSol: 5,
        minWalletAgeDays: 90,
      }),
    ).toBe(false);
  });
});
