import { z } from "zod";

const EnvSchema = z.object({
  BLOCKMORPH_DEV_MODE: z.string().optional(),
  BLOCKMORPH_DEV_SKIP_ZK: z.string().optional(),
  BLOCKMORPH_ISSUER_PUBLIC_KEY: z.string().optional(),
  BLOCKMORPH_ISSUER_SECRET_KEY: z.string().optional(),
  BLOCKMORPH_NULLIFIER_PEPPER: z.string().optional(),
  DATABASE_URL: z.string().optional(),
  NEXT_PUBLIC_APP_URL: z.string().default("http://localhost:3000"),
  NEXT_PUBLIC_MORPH_BADGE_ENABLED: z.string().default("false"),
  NEXT_PUBLIC_SOLANA_NETWORK: z.string().default("devnet"),
  NEXT_PUBLIC_SOLANA_RPC_URL: z.string().default("https://api.devnet.solana.com"),
});

export const env = EnvSchema.parse(process.env);

export function requireIssuerEnv() {
  if (!env.BLOCKMORPH_ISSUER_SECRET_KEY || !env.BLOCKMORPH_ISSUER_PUBLIC_KEY) {
    throw new Error("Issuer keys are missing. Run npm run issuer:keys and add them to .env.");
  }

  return {
    issuerPublicKey: env.BLOCKMORPH_ISSUER_PUBLIC_KEY,
    issuerSecretKey: env.BLOCKMORPH_ISSUER_SECRET_KEY,
  };
}

export function requireNullifierPepper() {
  if (!env.BLOCKMORPH_NULLIFIER_PEPPER) {
    throw new Error("BLOCKMORPH_NULLIFIER_PEPPER is required for capsule issuance.");
  }

  return env.BLOCKMORPH_NULLIFIER_PEPPER;
}

export function isDevModeEnabled() {
  return env.BLOCKMORPH_DEV_MODE === "true";
}
