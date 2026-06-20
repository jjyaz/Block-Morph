import { describe, expect, it } from "vitest";

import { createNullifier } from "@/lib/security";

describe("nullifier logic", () => {
  it("creates deterministic duplicate nullifiers per wallet and campaign", () => {
    const first = createNullifier("wallet", "campaign", "pepper");
    const duplicate = createNullifier("wallet", "campaign", "pepper");
    const differentCampaign = createNullifier("wallet", "other-campaign", "pepper");

    expect(first).toBe(duplicate);
    expect(first).not.toBe(differentCampaign);
  });
});
