"use client";

import type { BlockMorphCapsule } from "@blockmorph/sdk";

export const CAPSULE_VAULT_STORAGE_KEY = "blockmorph_capsule_vault_v1";

export type EncryptedMorphWalletBackup = {
  type: "blockmorph_encrypted_morph_wallet_v1";
  kdf: "PBKDF2-SHA256";
  iterations: number;
  salt: string;
  iv: string;
  ciphertext: string;
  publicKey: string;
  createdAt: string;
};

export type CapsuleVaultRecord = {
  capsule: BlockMorphCapsule;
  campaignName?: string;
  encryptedMorphWalletBackup?: EncryptedMorphWalletBackup;
  localRevokedAt?: string;
  savedAt: string;
  serverRevokedAt?: string | null;
};

export function readCapsuleVault(): CapsuleVaultRecord[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(CAPSULE_VAULT_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isCapsuleVaultRecord);
  } catch {
    return [];
  }
}

export function upsertCapsuleVaultRecord(record: CapsuleVaultRecord) {
  const records = readCapsuleVault();
  const next = [
    record,
    ...records.filter((item) => item.capsule.capsuleId !== record.capsule.capsuleId),
  ].sort(
    (left, right) =>
      new Date(right.capsule.issuedAt).getTime() - new Date(left.capsule.issuedAt).getTime(),
  );

  writeCapsuleVault(next);
  return next;
}

export function updateCapsuleVaultRecord(
  capsuleId: string,
  update: Partial<Pick<CapsuleVaultRecord, "localRevokedAt" | "serverRevokedAt">>,
) {
  const next = readCapsuleVault().map((record) =>
    record.capsule.capsuleId === capsuleId
      ? {
          ...record,
          ...update,
        }
      : record,
  );
  writeCapsuleVault(next);
  return next;
}

export function importCapsuleToVault(capsule: BlockMorphCapsule) {
  return upsertCapsuleVaultRecord({
    capsule,
    savedAt: new Date().toISOString(),
  });
}

function writeCapsuleVault(records: CapsuleVaultRecord[]) {
  window.localStorage.setItem(CAPSULE_VAULT_STORAGE_KEY, JSON.stringify(records));
}

function isCapsuleVaultRecord(value: unknown): value is CapsuleVaultRecord {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Partial<CapsuleVaultRecord>;
  return Boolean(
    record.capsule &&
      typeof record.capsule === "object" &&
      typeof record.capsule.capsuleId === "string" &&
      typeof record.savedAt === "string",
  );
}
