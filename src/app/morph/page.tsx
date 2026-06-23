"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import bs58 from "bs58";
import { useEffect, useState } from "react";

import { CapsuleCard } from "@/components/CapsuleCard";
import { MorphWalletVault, type BackupJson } from "@/components/MorphWalletVault";
import { TerminalPanel } from "@/components/TerminalPanel";
import { TierMeter } from "@/components/TierMeter";
import { WalletConnectButton } from "@/components/WalletConnectButton";
import { WireframeCard } from "@/components/WireframeCard";
import { upsertCapsuleVaultRecord } from "@/lib/capsuleVault";
import { fetchClientWalletMetrics, type ClientWalletMetrics } from "@/lib/clientSolanaMetrics";
import type { BlockMorphCapsule } from "@blockmorph/sdk";
import Link from "next/link";

type CampaignSummary = {
  campaignId: string;
  name: string;
  policyHash: string;
};

export default function MorphPage() {
  const wallet = useWallet();
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [campaignId, setCampaignId] = useState("general-reputation");
  const [metrics, setMetrics] = useState<ClientWalletMetrics | null>(null);
  const [morphWallet, setMorphWallet] = useState("");
  const [morphWalletBackup, setMorphWalletBackup] = useState<BackupJson | null>(null);
  const [capsule, setCapsule] = useState<BlockMorphCapsule | null>(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    fetch("/api/campaigns")
      .then((response) => response.json())
      .then((json) => {
        setCampaigns(json.campaigns ?? []);
        if (json.campaigns?.[0]?.campaignId) {
          setCampaignId(json.campaigns[0].campaignId);
        }
      })
      .catch(() => undefined);
  }, []);

  async function loadMetrics() {
    if (!wallet.publicKey) {
      setStatus("Connect a Solana wallet first.");
      return;
    }
    setStatus("Reading wallet metrics from Solana RPC...");
    const nextMetrics = await fetchClientWalletMetrics(wallet.publicKey.toBase58());
    setMetrics(nextMetrics);
    setStatus("Metrics loaded. Estimated visible SOL movement is computed from recent parsed transactions where available.");
  }

  async function issueCapsule() {
    if (!wallet.publicKey || !wallet.signMessage) {
      setStatus("Your wallet must support message signing.");
      return;
    }
    if (!morphWallet) {
      setStatus("Generate a local Morph Wallet first.");
      return;
    }

    setStatus("Requesting challenge...");
    const challengeResponse = await fetch("/api/challenge", { method: "POST" });
    const challengeJson = await challengeResponse.json();
    const challenge = challengeJson.challenge as string;
    const signature = await wallet.signMessage(new TextEncoder().encode(challenge));

    setStatus("Submitting issuer-signed capsule request...");
    const response = await fetch("/api/capsule/issue", {
      body: JSON.stringify({
        campaignId,
        challenge,
        morphWallet,
        signature: bs58.encode(signature),
        walletPublicKey: wallet.publicKey.toBase58(),
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    const json = await response.json();
    if (!response.ok) {
      setStatus(JSON.stringify(json.error ?? json));
      if (json.metrics) {
        setMetrics(json.metrics);
      }
      return;
    }

    setCapsule(json.capsule);
    setMetrics(json.metrics);
    upsertCapsuleVaultRecord({
      campaignName: campaigns.find((campaign) => campaign.campaignId === campaignId)?.name,
      capsule: json.capsule,
      encryptedMorphWalletBackup: morphWalletBackup ?? undefined,
      savedAt: new Date().toISOString(),
    });
    setStatus("Capsule issued and saved to My Capsules. Download it and use the Morph Wallet for campaign registration.");
  }

  function downloadCapsule() {
    if (!capsule) {
      return;
    }
    const blob = new Blob([JSON.stringify(capsule, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${capsule.campaignId}-${capsule.capsuleId}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function registerMorphWallet() {
    if (!capsule) {
      return;
    }
    setStatus("Registering Morph Wallet with campaign...");
    const response = await fetch(`/api/campaigns/${capsule.campaignId}/register`, {
      body: JSON.stringify({ capsule }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    const json = await response.json();
    setStatus(response.ok ? "Morph Wallet registered privately for campaign access." : JSON.stringify(json.error ?? json));
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-mono text-sm uppercase tracking-[0.24em] text-neon">Create Morph Capsule</p>
          <h1 className="mt-3 font-mono text-4xl text-green-50">Your main wallet stays in the dark.</h1>
        </div>
        <WalletConnectButton />
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <WireframeCard>
          <div className="grid gap-5">
            <label className="grid gap-2">
              <span className="font-mono text-xs uppercase tracking-[0.16em] text-green-300/70">
                Policy / campaign
              </span>
              <select
                className="rounded-xl border border-neon/25 bg-black/80 p-3 text-green-50"
                onChange={(event) => setCampaignId(event.target.value)}
                value={campaignId}
              >
                {campaigns.map((campaign) => (
                  <option key={campaign.campaignId} value={campaign.campaignId}>
                    {campaign.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="rounded-xl border border-neon/40 bg-neon/10 px-4 py-3 font-mono text-neon"
              onClick={loadMetrics}
              type="button"
            >
              Read Solana Wallet Metrics
            </button>
            {metrics ? (
              <div className="grid gap-3 rounded-xl border border-neon/20 bg-black/60 p-4 text-sm">
                <Metric label="Wallet" value={metrics.walletPublicKey} />
                <Metric label="SOL balance" value={metrics.balanceSol.toFixed(4)} />
                <Metric label="First seen approximation" value={metrics.firstSeenAt ?? "No signatures found"} />
                <Metric label="Wallet age days" value={String(metrics.walletAgeDays)} />
                <Metric label="Tx count estimate" value={`${metrics.txCountEstimate}${metrics.capped ? "+" : ""}`} />
                <Metric label="Recent activity count" value={String(metrics.recentActivityCount)} />
                <Metric
                  label="Estimated visible SOL movement"
                  value={`${metrics.estimatedVisibleSolMovement90d.toFixed(4)} SOL`}
                />
              </div>
            ) : null}
            <MorphWalletVault
              onWalletGenerated={(publicKey, backup) => {
                setMorphWallet(publicKey);
                setMorphWalletBackup(backup);
              }}
            />
            <button
              className="rounded-xl border border-neon/50 bg-neon/10 px-5 py-3 font-mono text-neon shadow-neon-soft"
              onClick={issueCapsule}
              type="button"
            >
              Sign challenge and issue capsule
            </button>
            {status ? <p className="text-sm text-green-100/70">{status}</p> : null}
          </div>
        </WireframeCard>

        <div className="grid gap-6">
          <TerminalPanel title="Issuer-signed privacy notice">
            BlockMorph sees the proving wallet during issuance in issuer-signed mode. Partners never see your proving
            wallet. They only see your Morph Wallet, tier, campaign scope, and capsule validity.
          </TerminalPanel>
          {capsule ? (
            <>
              <CapsuleCard capsule={capsule} />
              <TierMeter tier={capsule.tier} />
              <button
                className="rounded-xl border border-neon/40 bg-black/70 px-5 py-3 font-mono text-neon"
                onClick={downloadCapsule}
                type="button"
              >
                Download Capsule JSON
              </button>
              <button
                className="rounded-xl border border-neon/40 bg-neon/10 px-5 py-3 font-mono text-neon"
                onClick={registerMorphWallet}
                type="button"
              >
                Register Morph Wallet
              </button>
              <Link
                className="rounded-xl border border-neon/40 bg-black/70 px-5 py-3 text-center font-mono text-neon"
                href="/my-capsules"
              >
                View My Capsules
              </Link>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-[0.16em] text-green-300/60">{label}</p>
      <p className="break-all text-green-50/90">{value}</p>
    </div>
  );
}
