import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import nacl from "tweetnacl";
import { describe, expect, it } from "vitest";

import {
  CAPSULE_VERSION,
  POLICY_VERSION,
  createPolicyHash,
  isValidSolanaAddress,
  signCapsule,
  verifyCapsule,
  verifyCapsuleSignature,
} from "./index";

function unsignedCapsule(overrides: Partial<Parameters<typeof signCapsule>[0]> = {}) {
  const issuer = nacl.sign.keyPair();
  const morphWallet = Keypair.generate().publicKey.toBase58();
  const capsule = {
    campaignId: "general-reputation",
    capsuleId: "capsule-test-1",
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    issuedAt: new Date().toISOString(),
    issuer: "BlockMorph",
    issuerPublicKey: bs58.encode(issuer.publicKey),
    morphWallet,
    nullifier: "a".repeat(64),
    policyHash: createPolicyHash({
      campaignId: "general-reputation",
      expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
      minSolBalance: 0,
      minTxCount: 0,
      minVolume90dSol: 0,
      minWalletAgeDays: 0,
    }),
    policyVersion: POLICY_VERSION,
    proofMode: "issuer-signed" as const,
    tier: 2,
    tierLabel: "SILVER" as const,
    type: CAPSULE_VERSION,
    ...overrides,
  };

  return { capsule, issuer };
}

describe("@blockmorph/sdk", () => {
  it("creates stable policy hashes independent of tier order", () => {
    const left = createPolicyHash({
      allowedTiers: [4, 1, 2],
      campaignId: "dao-gate",
      expiresAt: "2027-01-01T00:00:00.000Z",
      minSolBalance: 0.5,
      minTxCount: 20,
      minVolume90dSol: 10,
      minWalletAgeDays: 90,
    });
    const right = createPolicyHash({
      allowedTiers: [1, 2, 4],
      campaignId: "dao-gate",
      expiresAt: "2027-01-01T00:00:00.000Z",
      minSolBalance: 0.5,
      minTxCount: 20,
      minVolume90dSol: 10,
      minWalletAgeDays: 90,
    });

    expect(left).toBe(right);
  });

  it("signs and verifies capsules", () => {
    const { capsule, issuer } = unsignedCapsule();
    const signed = signCapsule(capsule, issuer.secretKey);

    expect(verifyCapsuleSignature(signed, bs58.encode(issuer.publicKey))).toBe(true);
    expect(verifyCapsule(signed, { issuerPublicKey: bs58.encode(issuer.publicKey) }).valid).toBe(true);
  });

  it("rejects expired capsules", () => {
    const { capsule, issuer } = unsignedCapsule({
      expiresAt: new Date(Date.now() - 1_000).toISOString(),
    });
    const signed = signCapsule(capsule, issuer.secretKey);

    expect(verifyCapsule(signed, { issuerPublicKey: bs58.encode(issuer.publicKey) }).valid).toBe(false);
  });

  it("rejects capsules below campaign minTier", () => {
    const { capsule, issuer } = unsignedCapsule({ tier: 1, tierLabel: "BRONZE" });
    const signed = signCapsule(capsule, issuer.secretKey);

    const result = verifyCapsule(signed, {
      issuerPublicKey: bs58.encode(issuer.publicKey),
      minTier: 3,
    });

    expect(result.valid).toBe(false);
    expect(result.reasons.join(" ")).toContain("below required tier");
  });

  it("rejects invalid signatures", () => {
    const { capsule, issuer } = unsignedCapsule();
    const signed = signCapsule(capsule, issuer.secretKey);
    const tampered = { ...signed, tier: 4 };

    expect(verifyCapsuleSignature(tampered, bs58.encode(issuer.publicKey))).toBe(false);
  });

  it("rejects invalid Solana addresses", () => {
    expect(isValidSolanaAddress(Keypair.generate().publicKey.toBase58())).toBe(true);
    expect(isValidSolanaAddress("not-a-solana-address")).toBe(false);
  });
});
