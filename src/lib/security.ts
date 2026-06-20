import crypto from "node:crypto";

import { PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import nacl from "tweetnacl";

export function hashApiKey(apiKey: string): string {
  return crypto.createHash("sha256").update(apiKey).digest("hex");
}

export function generateApiKey() {
  return `bm_${crypto.randomBytes(32).toString("base64url")}`;
}

export function createNullifier(walletPublicKey: string, campaignId: string, pepper: string) {
  return crypto
    .createHash("sha256")
    .update(`${walletPublicKey}:${campaignId}:${pepper}`)
    .digest("hex");
}

export function randomNonce() {
  return crypto.randomBytes(24).toString("base64url");
}

export function verifyWalletSignature(input: {
  walletPublicKey: string;
  signature: string;
  challenge: string;
}) {
  try {
    const publicKey = new PublicKey(input.walletPublicKey);
    const signature = bs58.decode(input.signature);
    const message = new TextEncoder().encode(input.challenge);
    return nacl.sign.detached.verify(message, signature, publicKey.toBytes());
  } catch {
    return false;
  }
}

export function extractBearerToken(headerValue: string | null) {
  if (!headerValue?.startsWith("Bearer ")) {
    return null;
  }

  return headerValue.slice("Bearer ".length).trim();
}
