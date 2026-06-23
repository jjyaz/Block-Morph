import { z } from "zod";
import { CapsuleSchema } from "@blockmorph/sdk";

export const CampaignCreateSchema = z.object({
  allowedTiers: z.array(z.number().int().min(1).max(4)).min(1).default([1, 2, 3, 4]),
  campaignId: z
    .string()
    .min(3)
    .max(64)
    .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers, and dashes only"),
  expiresAt: z.string().datetime(),
  maxRegistrations: z.number().int().positive().nullable().optional(),
  minSolBalance: z.number().min(0).default(0),
  minTxCount: z.number().int().min(0).default(0),
  minVolume90dSol: z.number().min(0).default(0),
  minWalletAgeDays: z.number().int().min(0).default(0),
  name: z.string().min(2).max(120),
  webhookUrl: z.string().url().nullable().optional().or(z.literal("")),
});

export const CapsuleIssueSchema = z.object({
  campaignId: z.string().min(1),
  challenge: z.string().min(16),
  morphWallet: z.string().min(32),
  signature: z.string().min(32),
  walletPublicKey: z.string().min(32),
});

export const CapsuleVerifySchema = z.object({
  capsule: CapsuleSchema,
  minTier: z.number().int().min(1).max(4).optional(),
});

export const CapsuleRevokeSchema = z.object({
  capsule: CapsuleSchema,
});

export const RegisterSchema = z.object({
  capsule: CapsuleSchema,
});

export const WebhookTestSchema = z.object({
  campaignId: z.string().min(1),
});
