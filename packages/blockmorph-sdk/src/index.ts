import { PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import { sha256 } from "js-sha256";
import nacl from "tweetnacl";
import { z } from "zod";

export const CAPSULE_VERSION = "blockmorph_capsule_v1";
export const POLICY_VERSION = "blockmorph-policy-v1";
export const TIER_LABELS = ["BRONZE", "SILVER", "GOLD", "OBSIDIAN"] as const;

export type TierLabel = (typeof TIER_LABELS)[number];

export const CapsuleSchema = z.object({
  type: z.literal(CAPSULE_VERSION),
  policyVersion: z.literal(POLICY_VERSION),
  issuer: z.string().min(1),
  issuerPublicKey: z.string().min(32),
  capsuleId: z.string().min(8),
  campaignId: z.string().min(1),
  tier: z.number().int().min(1).max(4),
  tierLabel: z.enum(TIER_LABELS),
  morphWallet: z.string().min(32),
  nullifier: z.string().min(32),
  policyHash: z.string().min(32),
  issuedAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
  proofMode: z.enum(["issuer-signed", "zk"]),
  signature: z.string().min(32),
});

export type BlockMorphCapsule = z.infer<typeof CapsuleSchema>;

export type PolicyHashInput = {
  campaignId: string;
  minWalletAgeDays: number;
  minTxCount: number;
  minSolBalance: number;
  minVolume90dSol: number;
  allowedTiers?: number[];
  maxRegistrations?: number | null;
  expiresAt?: string | Date | null;
};

export type VerifyCapsuleOptions = {
  issuerPublicKey?: string;
  minTier?: number;
  expectedCampaignId?: string;
  expectedPolicyHash?: string;
  now?: Date;
};

export type CapsuleVerificationResult = {
  valid: boolean;
  reasons: string[];
  capsule?: BlockMorphCapsule;
};

export function isValidSolanaAddress(value: string): boolean {
  try {
    const key = new PublicKey(value);
    return PublicKey.isOnCurve(key.toBytes());
  } catch {
    return false;
  }
}

export function parseCapsuleJson(input: string | unknown): BlockMorphCapsule {
  const parsed = typeof input === "string" ? JSON.parse(input) : input;
  return CapsuleSchema.parse(parsed);
}

export function createPolicyHash(input: PolicyHashInput): string {
  const normalized = {
    allowedTiers: [...(input.allowedTiers ?? [1, 2, 3, 4])].sort((a, b) => a - b),
    campaignId: input.campaignId,
    expiresAt: normalizeDate(input.expiresAt),
    maxRegistrations: input.maxRegistrations ?? null,
    minSolBalance: Number(input.minSolBalance),
    minTxCount: Number(input.minTxCount),
    minVolume90dSol: Number(input.minVolume90dSol),
    minWalletAgeDays: Number(input.minWalletAgeDays),
    policyVersion: POLICY_VERSION,
  };

  return sha256(JSON.stringify(normalized));
}

export function capsuleSigningPayload(
  capsule: Omit<BlockMorphCapsule, "signature">,
): Uint8Array {
  return new TextEncoder().encode(canonicalJson(capsule));
}

export function signCapsule(
  capsule: Omit<BlockMorphCapsule, "signature">,
  issuerSecretKey: Uint8Array,
): BlockMorphCapsule {
  const signature = nacl.sign.detached(capsuleSigningPayload(capsule), issuerSecretKey);
  return {
    ...capsule,
    signature: bs58.encode(signature),
  };
}

export function verifyCapsuleSignature(
  capsule: BlockMorphCapsule,
  issuerPublicKey?: string,
): boolean {
  const publicKey = issuerPublicKey ?? capsule.issuerPublicKey;
  try {
    const signature = bs58.decode(capsule.signature);
    const key = bs58.decode(publicKey);
    const payload = Object.fromEntries(
      Object.entries(capsule).filter(([field]) => field !== "signature"),
    ) as Omit<BlockMorphCapsule, "signature">;
    return nacl.sign.detached.verify(capsuleSigningPayload(payload), signature, key);
  } catch {
    return false;
  }
}

export function verifyCapsule(
  capsuleInput: BlockMorphCapsule | string | unknown,
  options: VerifyCapsuleOptions = {},
): CapsuleVerificationResult {
  const reasons: string[] = [];
  let capsule: BlockMorphCapsule;

  try {
    capsule = parseCapsuleJson(capsuleInput);
  } catch (error) {
    return {
      valid: false,
      reasons: [error instanceof Error ? error.message : "Capsule schema is invalid"],
    };
  }

  const now = options.now ?? new Date();
  if (options.issuerPublicKey && capsule.issuerPublicKey !== options.issuerPublicKey) {
    reasons.push("Issuer public key does not match the trusted key");
  }

  if (!verifyCapsuleSignature(capsule, options.issuerPublicKey)) {
    reasons.push("Capsule signature is invalid");
  }

  if (new Date(capsule.expiresAt).getTime() <= now.getTime()) {
    reasons.push("Capsule is expired");
  }

  if (options.minTier && capsule.tier < options.minTier) {
    reasons.push(`Capsule tier ${capsule.tier} is below required tier ${options.minTier}`);
  }

  if (options.expectedCampaignId && capsule.campaignId !== options.expectedCampaignId) {
    reasons.push("Capsule campaign does not match the expected campaign");
  }

  if (options.expectedPolicyHash && capsule.policyHash !== options.expectedPolicyHash) {
    reasons.push("Capsule policy hash does not match the campaign policy");
  }

  if (!isValidSolanaAddress(capsule.morphWallet)) {
    reasons.push("Morph Wallet is not a valid on-curve Solana address");
  }

  return {
    capsule,
    reasons,
    valid: reasons.length === 0,
  };
}

export class BlockMorphClient {
  constructor(private readonly baseUrl: string) {}

  async verifyCapsule(capsule: BlockMorphCapsule, minTier?: number) {
    const response = await fetch(`${this.baseUrl}/api/capsule/verify`, {
      body: JSON.stringify({ capsule, minTier }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });

    if (!response.ok) {
      throw new Error(`BlockMorph verify failed with ${response.status}`);
    }

    return response.json() as Promise<CapsuleVerificationResult>;
  }

  async register(campaignId: string, capsule: BlockMorphCapsule) {
    const response = await fetch(`${this.baseUrl}/api/campaigns/${campaignId}/register`, {
      body: JSON.stringify({ capsule }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });

    if (!response.ok) {
      throw new Error(`BlockMorph registration failed with ${response.status}`);
    }

    return response.json() as Promise<{ registered: boolean; capsuleId: string }>;
  }
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

function normalizeDate(value: PolicyHashInput["expiresAt"]): string | null {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}
