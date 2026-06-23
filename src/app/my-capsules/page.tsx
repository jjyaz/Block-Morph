"use client";

import type { BlockMorphCapsule } from "@blockmorph/sdk";
import { parseCapsuleJson } from "@blockmorph/sdk";
import Link from "next/link";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { TerminalPanel } from "@/components/TerminalPanel";
import { WireframeCard } from "@/components/WireframeCard";
import {
  importCapsuleToVault,
  readCapsuleVault,
  updateCapsuleVaultRecord,
  type CapsuleVaultRecord,
} from "@/lib/capsuleVault";

type VerificationState = {
  checkedAt: string;
  reasons: string[];
  revokedAt?: string | null;
  valid: boolean;
};

export default function MyCapsulesPage() {
  const [importJson, setImportJson] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [records, setRecords] = useState<CapsuleVaultRecord[]>([]);
  const [status, setStatus] = useState("");
  const [verification, setVerification] = useState<Record<string, VerificationState>>({});

  const refreshVerification = useCallback(async (vaultRecords: CapsuleVaultRecord[], cancelled = false) => {
    const entries = await Promise.all(
      vaultRecords.map(async (record) => {
        const state = await verifyCapsule(record.capsule);
        return [record.capsule.capsuleId, state] as const;
      }),
    );

    if (!cancelled) {
      setVerification(Object.fromEntries(entries));
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function hydrateVault() {
      const vaultRecords = readCapsuleVault();
      if (cancelled) {
        return;
      }
      setRecords(vaultRecords);
      await refreshVerification(vaultRecords, cancelled);
    }

    void hydrateVault();

    return () => {
      cancelled = true;
    };
  }, [refreshVerification]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  const stats = useMemo(() => {
    const active = records.filter(
      (record) =>
        !isRevoked(record, verification[record.capsule.capsuleId]) &&
        new Date(record.capsule.expiresAt).getTime() > now,
    ).length;
    const expired = records.filter(
      (record) => new Date(record.capsule.expiresAt).getTime() <= now,
    ).length;
    const revoked = records.filter((record) =>
      isRevoked(record, verification[record.capsule.capsuleId]),
    ).length;

    return { active, expired, revoked, total: records.length };
  }, [now, records, verification]);

  function downloadJson(filename: string, value: unknown) {
    const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function importCapsule() {
    try {
      const capsule = parseCapsuleJson(importJson);
      const next = importCapsuleToVault(capsule);
      setRecords(next);
      setImportJson("");
      setStatus("Capsule imported into your local vault.");
      void refreshVerification(next);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Capsule JSON could not be imported.");
    }
  }

  async function revokeCapsule(record: CapsuleVaultRecord) {
    const confirmed = window.confirm(
      "Revoke/nullify this capsule? BlockMorph will mark the issued capsule revoked and remove matching live registrations from BlockMorph whitelist exports.",
    );
    if (!confirmed) {
      return;
    }

    setStatus(`Revoking capsule ${record.capsule.capsuleId}...`);
    const response = await fetch("/api/capsule/revoke", {
      body: JSON.stringify({ capsule: record.capsule }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    const json = await response.json();

    if (!response.ok) {
      setStatus(JSON.stringify(json.error ?? json));
      return;
    }

    const revokedAt = String(json.revokedAt ?? new Date().toISOString());
    const next = updateCapsuleVaultRecord(record.capsule.capsuleId, {
      localRevokedAt: revokedAt,
      serverRevokedAt: revokedAt,
    });
    setRecords(next);
    setVerification((current) => ({
      ...current,
      [record.capsule.capsuleId]: {
        checkedAt: new Date().toISOString(),
        reasons: [`Capsule was revoked at ${revokedAt}`],
        revokedAt,
        valid: false,
      },
    }));
    setStatus("Capsule revoked/nullified. API verification and new registrations will reject it.");
  }

  return (
    <div className="mx-auto max-w-7xl px-5 py-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-sm uppercase tracking-[0.24em] text-neon">
            User Capsule Dashboard
          </p>
          <h1 className="mt-3 font-mono text-4xl text-green-50">
            Every Morph Capsule you keep in this browser.
          </h1>
          <p className="mt-4 max-w-3xl leading-7 text-green-100/70">
            BlockMorph stores capsule vaults locally in your browser after issuance. Your proving
            wallet still does not appear in capsule JSON, and encrypted Morph Wallet backups never
            leave your device.
          </p>
        </div>
        <Link
          className="rounded-xl border border-neon/40 bg-neon/10 px-5 py-3 font-mono text-neon"
          href="/morph"
        >
          Create Morph Capsule
        </Link>
      </div>

      <section className="mt-8 grid gap-4 md:grid-cols-4">
        <Stat label="Total" value={stats.total} />
        <Stat label="Active" value={stats.active} />
        <Stat label="Expired" value={stats.expired} />
        <Stat label="Revoked/nullified" value={stats.revoked} />
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.45fr]">
        <div className="grid gap-5">
          {records.length === 0 ? (
            <WireframeCard>
              <h2 className="font-mono text-2xl text-neon">No local capsules yet</h2>
              <p className="mt-4 leading-7 text-green-100/70">
                Create a capsule from `/morph`, or import an existing capsule JSON into this
                browser-local vault.
              </p>
            </WireframeCard>
          ) : (
            records.map((record) => (
              <CapsuleVaultCard
                key={record.capsule.capsuleId}
                now={now}
                onDownloadCapsule={() =>
                  downloadJson(
                    `${record.capsule.campaignId}-${record.capsule.capsuleId}.json`,
                    record.capsule,
                  )
                }
                onDownloadVault={() => {
                  if (record.encryptedMorphWalletBackup) {
                    downloadJson(
                      `blockmorph-vault-${record.capsule.morphWallet}.json`,
                      record.encryptedMorphWalletBackup,
                    );
                  }
                }}
                onRevoke={() => revokeCapsule(record)}
                record={record}
                verification={verification[record.capsule.capsuleId]}
              />
            ))
          )}
        </div>

        <div className="grid content-start gap-6">
          <TerminalPanel title="Import capsule JSON">
            <label className="grid gap-3">
              <span className="text-green-100/70">
                Paste a capsule you previously downloaded to add it to this browser vault.
              </span>
              <textarea
                className="min-h-48 rounded-xl border border-neon/25 bg-black/80 p-3 font-mono text-xs text-green-50 outline-none focus:border-neon"
                onChange={(event) => setImportJson(event.target.value)}
                placeholder="{ ...capsule JSON... }"
                value={importJson}
              />
            </label>
            <button
              className="mt-3 rounded-xl border border-neon/40 bg-neon/10 px-4 py-2 font-mono text-neon"
              onClick={importCapsule}
              type="button"
            >
              Import capsule
            </button>
          </TerminalPanel>

          <TerminalPanel title="Revoke / nullify model">
            <ul className="grid gap-3">
              <li>Revocation uses the valid signed capsule as the authority to nullify it.</li>
              <li>BlockMorph marks the issued capsule revoked server-side.</li>
              <li>Matching live registrations are removed from BlockMorph whitelist exports.</li>
              <li>Keep capsule files private; anyone with the full capsule can request revocation.</li>
            </ul>
          </TerminalPanel>

          {status ? (
            <div className="rounded-2xl border border-neon/20 bg-black/70 p-4 text-sm text-green-100/75">
              {status}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function CapsuleVaultCard({
  now,
  onDownloadCapsule,
  onDownloadVault,
  onRevoke,
  record,
  verification,
}: {
  now: number;
  onDownloadCapsule: () => void;
  onDownloadVault: () => void;
  onRevoke: () => void;
  record: CapsuleVaultRecord;
  verification?: VerificationState;
}) {
  const capsule = record.capsule;
  const revoked = isRevoked(record, verification);
  const expired = new Date(capsule.expiresAt).getTime() <= now;
  const stateLabel = revoked ? "REVOKED" : expired ? "EXPIRED" : verification?.valid === false ? "INVALID" : "ACTIVE";

  return (
    <WireframeCard>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-neon">
            {capsule.campaignId}
          </p>
          <h2 className="mt-2 break-all font-mono text-2xl text-green-50">{capsule.tierLabel}</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <Tag>{stateLabel}</Tag>
            <Tag>{capsule.proofMode}</Tag>
            <Tag>tier {capsule.tier}</Tag>
            <Tag>{record.campaignName ?? "campaign scope"}</Tag>
          </div>
        </div>
        <div className="rounded-2xl border border-neon/20 bg-black/60 p-4 text-right">
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-green-300/60">
            Expiry countdown
          </p>
          <p className="mt-2 font-mono text-lg text-neon">{countdown(capsule.expiresAt, now)}</p>
        </div>
      </div>

      <dl className="mt-5 grid gap-3 text-sm text-green-100/75 md:grid-cols-2">
        <Meta label="Morph Wallet" value={capsule.morphWallet} />
        <Meta label="Capsule ID" value={capsule.capsuleId} />
        <Meta label="Nullifier" value={capsule.nullifier} />
        <Meta label="Saved locally" value={new Date(record.savedAt).toLocaleString()} />
        <Meta label="Issued" value={new Date(capsule.issuedAt).toLocaleString()} />
        <Meta label="Expires" value={new Date(capsule.expiresAt).toLocaleString()} />
      </dl>

      {verification?.reasons.length ? (
        <div className="mt-4 rounded-xl border border-yellow-300/20 bg-yellow-300/5 p-3 text-sm text-yellow-100">
          {verification.reasons.join(" ")}
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          className="rounded-xl border border-neon/35 bg-black/70 px-4 py-2 font-mono text-sm text-neon"
          onClick={onDownloadCapsule}
          type="button"
        >
          Download capsule JSON
        </button>
        <button
          className="rounded-xl border border-neon/35 bg-black/70 px-4 py-2 font-mono text-sm text-neon disabled:opacity-40"
          disabled={!record.encryptedMorphWalletBackup}
          onClick={onDownloadVault}
          type="button"
        >
          Download encrypted wallet vault
        </button>
        <button
          className="rounded-xl border border-red-400/40 bg-red-400/10 px-4 py-2 font-mono text-sm text-red-100 disabled:opacity-40"
          disabled={revoked}
          onClick={onRevoke}
          type="button"
        >
          Revoke / nullify
        </button>
      </div>
    </WireframeCard>
  );
}

async function verifyCapsule(capsule: BlockMorphCapsule): Promise<VerificationState> {
  try {
    const response = await fetch("/api/capsule/verify", {
      body: JSON.stringify({ capsule }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    const json = await response.json();
    return {
      checkedAt: new Date().toISOString(),
      reasons: Array.isArray(json.reasons) ? json.reasons.map(String) : [],
      revokedAt: typeof json.revokedAt === "string" ? json.revokedAt : null,
      valid: Boolean(json.valid && response.ok),
    };
  } catch (error) {
    return {
      checkedAt: new Date().toISOString(),
      reasons: [error instanceof Error ? error.message : "Verification failed"],
      valid: false,
    };
  }
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-neon/20 bg-black/70 p-4">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-green-300/60">{label}</p>
      <p className="mt-2 text-3xl text-green-50">{value}</p>
    </div>
  );
}

function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-neon/25 bg-neon/5 px-3 py-1 font-mono text-xs text-neon">
      {children}
    </span>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-xs uppercase tracking-[0.16em] text-green-300/60">{label}</dt>
      <dd className="mt-1 break-all text-green-50/90">{value}</dd>
    </div>
  );
}

function isRevoked(record: CapsuleVaultRecord, state: VerificationState | undefined) {
  return Boolean(record.localRevokedAt || record.serverRevokedAt || state?.revokedAt);
}

function countdown(expiresAt: string, now: number) {
  const remaining = new Date(expiresAt).getTime() - now;
  if (remaining <= 0) {
    return "expired";
  }

  const totalSeconds = Math.floor(remaining / 1000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }

  return `${hours}h ${minutes}m ${seconds}s`;
}
