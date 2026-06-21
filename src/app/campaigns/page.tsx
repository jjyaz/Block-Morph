"use client";

import { useEffect, useState } from "react";

import { CampaignPolicyBuilder, type CampaignDraft } from "@/components/CampaignPolicyBuilder";
import { TerminalPanel } from "@/components/TerminalPanel";
import { WireframeCard } from "@/components/WireframeCard";

type Campaign = {
  allowedTiers: number[];
  campaignId: string;
  enabled: boolean;
  expiresAt: string;
  maxRegistrations: number | null;
  minSolBalance: number;
  minTxCount: number;
  minVolume90dSol: number;
  minWalletAgeDays: number;
  name: string;
  policyHash: string;
};

type Registration = {
  capsuleId: string;
  morphWallet: string;
  registeredAt: string;
  tier: number;
  tierLabel: string;
};

export default function CampaignsPage() {
  const [builderDraft, setBuilderDraft] = useState<CampaignDraft | null>(null);
  const [builderDraftKey, setBuilderDraftKey] = useState(0);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [apiKey, setApiKey] = useState("");
  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [rotateModalOpen, setRotateModalOpen] = useState(false);
  const [webhookResult, setWebhookResult] = useState<Record<string, unknown> | null>(null);
  const [status, setStatus] = useState("");

  async function loadCampaigns() {
    const response = await fetch("/api/campaigns");
    const json = await response.json();
    setCampaigns(json.campaigns ?? []);
    if (!selected && json.campaigns?.[0]?.campaignId) {
      setSelected(json.campaigns[0].campaignId);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadInitialCampaigns() {
      const response = await fetch("/api/campaigns");
      const json = await response.json();
      if (cancelled) {
        return;
      }
      setCampaigns(json.campaigns ?? []);
      if (json.campaigns?.[0]?.campaignId) {
        setSelected(json.campaigns[0].campaignId);
      }
    }

    void loadInitialCampaigns();

    return () => {
      cancelled = true;
    };
  }, []);

  async function loadRegistrations(campaignId = selected) {
    if (!campaignId) {
      return;
    }
    const response = await fetch(`/api/campaigns/${campaignId}`);
    const json = await response.json();
    setRegistrations(json.registrations ?? []);
  }

  async function rotateApiKey() {
    setRotateModalOpen(false);
    const response = await fetch(`/api/campaigns/${selected}`, {
      body: JSON.stringify({ action: "rotate-api-key" }),
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      method: "PATCH",
    });
    const json = await response.json();
    if (!response.ok) {
      setStatus(JSON.stringify(json.error ?? json));
      return;
    }
    setApiKey(json.apiKey);
    setApiKeyVisible(true);
    setStatus("API key rotated. Store the new value now.");
  }

  async function setEnabled(enabled: boolean) {
    const response = await fetch(`/api/campaigns/${selected}`, {
      body: JSON.stringify({ action: enabled ? "enable" : "disable" }),
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      method: "PATCH",
    });
    const json = await response.json();
    setStatus(response.ok ? "Campaign updated." : JSON.stringify(json.error ?? json));
    await loadCampaigns();
  }

  async function exportCsv() {
    const response = await fetch(`/api/campaigns/${selected}/whitelist`, {
      headers: {
        accept: "text/csv",
        authorization: `Bearer ${apiKey}`,
      },
    });
    if (!response.ok) {
      setStatus("CSV export failed. Check campaign API key.");
      return;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${selected}-whitelist.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function duplicateCampaign() {
    if (!current) {
      return;
    }

    const suffix = new Date().toISOString().slice(0, 10).replaceAll("-", "");
    setBuilderDraft({
      allowedTiers: current.allowedTiers,
      campaignId: `${current.campaignId}-copy-${suffix}`,
      expiresAt: toLocalDateTime(current.expiresAt),
      maxRegistrations: current.maxRegistrations ? String(current.maxRegistrations) : "",
      minSolBalance: String(current.minSolBalance),
      minTxCount: String(current.minTxCount),
      minVolume90dSol: String(current.minVolume90dSol),
      minWalletAgeDays: String(current.minWalletAgeDays),
      name: `${current.name} copy`,
      webhookUrl: "",
    });
    setBuilderDraftKey((key) => key + 1);
    setStatus("Campaign duplicated into the builder. Review webhook URL and slug before launch.");
  }

  async function copyApiKey() {
    if (!apiKey) {
      setStatus("Paste or rotate a campaign API key before copying.");
      return;
    }

    await navigator.clipboard.writeText(apiKey);
    setStatus("Campaign API key copied.");
  }

  async function testWebhook() {
    if (!selected) {
      return;
    }

    setWebhookResult({ status: "Sending webhook test..." });
    const response = await fetch("/api/webhooks/test", {
      body: JSON.stringify({ campaignId: selected }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    const json = await response.json();
    setWebhookResult({
      httpStatus: response.status,
      ...json,
    });
  }

  const current = campaigns.find((campaign) => campaign.campaignId === selected);
  const counts = registrations.reduce<Record<string, number>>((acc, registration) => {
    acc[registration.tierLabel] = (acc[registration.tierLabel] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-7xl px-5 py-12">
      <p className="font-mono text-sm uppercase tracking-[0.24em] text-neon">Campaign Builder</p>
      <h1 className="mt-3 font-mono text-4xl text-green-50">Launch gates without collecting main wallets.</h1>
      <div className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <WireframeCard>
          <CampaignPolicyBuilder
            draft={builderDraft}
            key={builderDraftKey}
            onCreated={loadCampaigns}
          />
        </WireframeCard>
        <div className="grid gap-6">
          <TerminalPanel title="Campaign operations">
            <div className="grid gap-4">
              <label className="grid gap-2">
                <span className="font-mono text-xs uppercase tracking-[0.16em] text-green-300/70">Campaign</span>
                <select
                  className="rounded-xl border border-neon/25 bg-black/80 p-3"
                  onChange={(event) => {
                    setSelected(event.target.value);
                    void loadRegistrations(event.target.value);
                  }}
                  value={selected}
                >
                  {campaigns.map((campaign) => (
                    <option key={campaign.campaignId} value={campaign.campaignId}>
                      {campaign.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2">
                <span className="font-mono text-xs uppercase tracking-[0.16em] text-green-300/70">Campaign API key</span>
                <div className="grid gap-2 rounded-xl border border-neon/20 bg-black/60 p-2">
                  <input
                    className="rounded-lg border border-neon/25 bg-black/80 p-3"
                    onChange={(event) => setApiKey(event.target.value)}
                    placeholder="bm_..."
                    type={apiKeyVisible ? "text" : "password"}
                    value={apiKey}
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="rounded-lg border border-neon/25 px-3 py-1 text-sm text-neon"
                      onClick={() => setApiKeyVisible((visible) => !visible)}
                      type="button"
                    >
                      {apiKeyVisible ? "Hide" : "Reveal"}
                    </button>
                    <button
                      className="rounded-lg border border-neon/25 px-3 py-1 text-sm text-neon"
                      onClick={copyApiKey}
                      type="button"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </label>
              <div className="flex flex-wrap gap-3">
                <button className="rounded-xl border border-neon/30 px-4 py-2 text-neon" onClick={() => loadRegistrations()} type="button">
                  View registered Morph Wallets
                </button>
                <button className="rounded-xl border border-neon/30 px-4 py-2 text-neon" onClick={exportCsv} type="button">
                  Export CSV whitelist
                </button>
                <button className="rounded-xl border border-neon/30 px-4 py-2 text-neon" onClick={duplicateCampaign} type="button">
                  Duplicate campaign
                </button>
                <button className="rounded-xl border border-neon/30 px-4 py-2 text-neon" onClick={testWebhook} type="button">
                  Test webhook
                </button>
                <button className="rounded-xl border border-yellow-300/40 px-4 py-2 text-yellow-100" onClick={() => setRotateModalOpen(true)} type="button">
                  Rotate API key
                </button>
                <button className="rounded-xl border border-red-400/40 px-4 py-2 text-red-200" onClick={() => setEnabled(false)} type="button">
                  Disable
                </button>
                <button className="rounded-xl border border-neon/30 px-4 py-2 text-neon" onClick={() => setEnabled(true)} type="button">
                  Enable
                </button>
              </div>
              {status ? <p>{status}</p> : null}
              {webhookResult ? (
                <pre className="max-h-64 overflow-auto rounded-xl border border-neon/15 bg-black/70 p-3 text-xs text-green-100">
                  {JSON.stringify(webhookResult, null, 2)}
                </pre>
              ) : null}
            </div>
          </TerminalPanel>
          {current ? (
            <WireframeCard>
              <h2 className="font-mono text-xl text-neon">{current.name}</h2>
              <div className="mt-4 grid gap-2 text-sm text-green-100/80">
                <p>Enabled: {String(current.enabled)}</p>
                <p>Min age: {current.minWalletAgeDays} days</p>
                <p>Min tx: {current.minTxCount}</p>
                <p>Min balance: {current.minSolBalance} SOL</p>
                <p>Min estimated visible SOL movement: {current.minVolume90dSol} SOL</p>
                <p>Max registrations: {current.maxRegistrations ?? "uncapped"}</p>
                <p className="break-all">Policy hash: {current.policyHash}</p>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
                {["BRONZE", "SILVER", "GOLD", "OBSIDIAN"].map((tier) => (
                  <div className="rounded-xl border border-neon/20 p-3" key={tier}>
                    <p className="font-mono text-xs text-neon">{tier}</p>
                    <p className="text-2xl text-green-50">{counts[tier] ?? 0}</p>
                  </div>
                ))}
              </div>
            </WireframeCard>
          ) : null}
          <WireframeCard>
            <h2 className="font-mono text-xl text-neon">Registered Morph Wallets</h2>
            <div className="mt-4 grid gap-3">
              {registrations.map((registration) => (
                <div className="rounded-xl border border-neon/15 bg-black/50 p-3 text-sm" key={registration.capsuleId}>
                  <p className="break-all text-green-50">{registration.morphWallet}</p>
                  <p className="text-green-100/60">
                    {registration.tierLabel} - {new Date(registration.registeredAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </WireframeCard>
        </div>
      </div>
      {rotateModalOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 px-5 backdrop-blur">
          <div className="max-w-lg rounded-2xl border border-yellow-300/40 bg-[#030603] p-6 shadow-neon-soft">
            <p className="font-mono text-sm uppercase tracking-[0.18em] text-yellow-100">
              Confirm API key rotation
            </p>
            <p className="mt-4 leading-7 text-green-100/75">
              Rotating the API key immediately invalidates the current key for whitelist export and
              campaign administration. Copy the new key after rotation and update partner backends.
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                className="rounded-xl border border-green-100/20 px-4 py-2 text-green-100"
                onClick={() => setRotateModalOpen(false)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="rounded-xl border border-yellow-300/40 bg-yellow-300/10 px-4 py-2 text-yellow-100"
                onClick={rotateApiKey}
                type="button"
              >
                Rotate and reveal new key
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function toLocalDateTime(value: string) {
  const date = new Date(value);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}
