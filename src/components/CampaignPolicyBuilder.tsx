"use client";

import { FormEvent, useState } from "react";

type CreatedCampaign = {
  apiKey: string;
  campaign: {
    campaignId: string;
    name: string;
    policyHash: string;
  };
};

export function CampaignPolicyBuilder({ onCreated }: { onCreated?: () => void }) {
  const [result, setResult] = useState<CreatedCampaign | null>(null);
  const [status, setStatus] = useState<string>("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("Creating campaign...");
    const form = new FormData(event.currentTarget);
    const allowedTiers = form
      .getAll("allowedTiers")
      .map((value) => Number(value))
      .filter(Boolean);

    const response = await fetch("/api/campaigns", {
      body: JSON.stringify({
        allowedTiers,
        campaignId: form.get("campaignId"),
        expiresAt: new Date(String(form.get("expiresAt"))).toISOString(),
        maxRegistrations: form.get("maxRegistrations")
          ? Number(form.get("maxRegistrations"))
          : null,
        minSolBalance: Number(form.get("minSolBalance")),
        minTxCount: Number(form.get("minTxCount")),
        minVolume90dSol: Number(form.get("minVolume90dSol")),
        minWalletAgeDays: Number(form.get("minWalletAgeDays")),
        name: form.get("name"),
        webhookUrl: form.get("webhookUrl") || null,
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    const json = await response.json();
    if (!response.ok) {
      setStatus(JSON.stringify(json.error ?? json));
      return;
    }

    setResult(json);
    setStatus("Campaign created. Store the API key now; BlockMorph only returns it once.");
    onCreated?.();
  }

  return (
    <form className="grid gap-4" onSubmit={submit}>
      <Field label="Campaign name" name="name" placeholder="Obsidian presale" required />
      <Field label="Campaign slug" name="campaignId" placeholder="obsidian-presale" required />
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Min wallet age days" name="minWalletAgeDays" type="number" value="30" />
        <Field label="Min tx count" name="minTxCount" type="number" value="10" />
        <Field label="Min SOL balance" name="minSolBalance" step="0.01" type="number" value="0" />
        <Field
          label="Min estimated visible SOL movement"
          name="minVolume90dSol"
          step="0.01"
          type="number"
          value="0"
        />
        <Field label="Max registrations" name="maxRegistrations" type="number" />
        <Field
          label="Expiry"
          name="expiresAt"
          required
          type="datetime-local"
          value={defaultExpiryLocal()}
        />
      </div>
      <Field label="Webhook URL" name="webhookUrl" placeholder="https://partner.app/webhook" />
      <fieldset className="rounded-xl border border-neon/20 p-3">
        <legend className="px-2 font-mono text-xs uppercase tracking-[0.16em] text-neon">
          Allowed tiers
        </legend>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {[
            [1, "BRONZE"],
            [2, "SILVER"],
            [3, "GOLD"],
            [4, "OBSIDIAN"],
          ].map(([tier, label]) => (
            <label className="flex items-center gap-2 text-sm text-green-100/80" key={tier}>
              <input defaultChecked name="allowedTiers" type="checkbox" value={tier} />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      <button className="rounded-xl border border-neon/50 bg-neon/10 px-5 py-3 font-mono text-neon shadow-neon-soft transition hover:bg-neon/20">
        Launch Campaign
      </button>
      {status ? <p className="text-sm text-green-100/70">{status}</p> : null}
      {result ? (
        <div className="rounded-xl border border-neon/25 bg-black/70 p-4 text-sm">
          <p className="font-mono text-neon">{result.campaign.name}</p>
          <p className="mt-2 break-all">Policy hash: {result.campaign.policyHash}</p>
          <p className="mt-2 break-all text-yellow-100">API key: {result.apiKey}</p>
        </div>
      ) : null}
    </form>
  );
}

function Field({
  label,
  name,
  placeholder,
  required,
  step,
  type = "text",
  value,
}: {
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  step?: string;
  type?: string;
  value?: string;
}) {
  return (
    <label className="grid gap-2 text-sm text-green-100/75">
      <span className="font-mono text-xs uppercase tracking-[0.16em] text-green-300/70">
        {label}
      </span>
      <input
        className="rounded-xl border border-neon/25 bg-black/70 px-3 py-2 text-green-50 outline-none transition focus:border-neon"
        defaultValue={value}
        name={name}
        placeholder={placeholder}
        required={required}
        step={step}
        type={type}
      />
    </label>
  );
}

function defaultExpiryLocal() {
  const date = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}
