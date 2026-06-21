"use client";

import { FormEvent, useMemo, useState } from "react";

type CreatedCampaign = {
  apiKey: string;
  campaign: {
    campaignId: string;
    name: string;
    policyHash: string;
  };
};

export type CampaignDraft = {
  allowedTiers: number[];
  campaignId: string;
  expiresAt: string;
  maxRegistrations: string;
  minSolBalance: string;
  minTxCount: string;
  minVolume90dSol: string;
  minWalletAgeDays: string;
  name: string;
  webhookUrl: string;
};

type Template = {
  description: string;
  draft: CampaignDraft;
  id: string;
  label: string;
};

const TIER_OPTIONS = [
  [1, "BRONZE"],
  [2, "SILVER"],
  [3, "GOLD"],
  [4, "OBSIDIAN"],
] as const;

const DEFAULT_DRAFT: CampaignDraft = {
  allowedTiers: [1, 2, 3, 4],
  campaignId: "general-reputation",
  expiresAt: defaultExpiryLocal(30),
  maxRegistrations: "",
  minSolBalance: "0",
  minTxCount: "10",
  minVolume90dSol: "0",
  minWalletAgeDays: "30",
  name: "General reputation capsule",
  webhookUrl: "",
};

const TEMPLATES: Template[] = [
  {
    description: "Broad eligibility for private airdrop claims.",
    draft: {
      ...DEFAULT_DRAFT,
      allowedTiers: [1, 2, 3, 4],
      campaignId: "private-airdrop",
      maxRegistrations: "1000",
      minSolBalance: "0.05",
      minTxCount: "5",
      minVolume90dSol: "0",
      minWalletAgeDays: "14",
      name: "Private airdrop",
    },
    id: "airdrop",
    label: "Airdrop",
  },
  {
    description: "Higher reputation gate for governance access.",
    draft: {
      ...DEFAULT_DRAFT,
      allowedTiers: [2, 3, 4],
      campaignId: "dao-vote",
      minSolBalance: "0.5",
      minTxCount: "50",
      minVolume90dSol: "5",
      minWalletAgeDays: "90",
      name: "DAO vote gate",
    },
    id: "dao-vote",
    label: "DAO vote",
  },
  {
    description: "Balanced presale/allowlist access gate.",
    draft: {
      ...DEFAULT_DRAFT,
      allowedTiers: [2, 3, 4],
      campaignId: "presale-allowlist",
      maxRegistrations: "500",
      minSolBalance: "0.25",
      minTxCount: "25",
      minVolume90dSol: "2",
      minWalletAgeDays: "45",
      name: "Presale allowlist",
    },
    id: "allowlist",
    label: "Allowlist",
  },
];

export function CampaignPolicyBuilder({
  draft,
  onCreated,
}: {
  draft?: CampaignDraft | null;
  onCreated?: () => void;
}) {
  const [form, setForm] = useState<CampaignDraft>(draft ?? DEFAULT_DRAFT);
  const [result, setResult] = useState<CreatedCampaign | null>(null);
  const [showCreatedApiKey, setShowCreatedApiKey] = useState(false);
  const [status, setStatus] = useState<string>("");
  const preview = useMemo(() => calculateAudiencePreview(form), [form]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("Creating campaign...");

    const response = await fetch("/api/campaigns", {
      body: JSON.stringify({
        allowedTiers: form.allowedTiers,
        campaignId: form.campaignId,
        expiresAt: new Date(form.expiresAt).toISOString(),
        maxRegistrations: form.maxRegistrations ? Number(form.maxRegistrations) : null,
        minSolBalance: Number(form.minSolBalance),
        minTxCount: Number(form.minTxCount),
        minVolume90dSol: Number(form.minVolume90dSol),
        minWalletAgeDays: Number(form.minWalletAgeDays),
        name: form.name,
        webhookUrl: form.webhookUrl || null,
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
    setShowCreatedApiKey(false);
    setStatus("Campaign created. Reveal, copy, and store the API key now; BlockMorph only returns it once.");
    onCreated?.();
  }

  function update<K extends keyof CampaignDraft>(key: K, value: CampaignDraft[K]) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function applyTemplate(template: Template) {
    setForm({
      ...template.draft,
      expiresAt: defaultExpiryLocal(30),
    });
    setResult(null);
    setStatus(`${template.label} template loaded.`);
  }

  async function copyCreatedApiKey() {
    if (!result?.apiKey) {
      return;
    }

    await navigator.clipboard.writeText(result.apiKey);
    setStatus("API key copied. Keep it in a secure partner backend or secrets manager.");
  }

  return (
    <form className="grid gap-4" onSubmit={submit}>
      <section className="rounded-xl border border-neon/20 bg-black/50 p-3">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-neon">Templates</p>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {TEMPLATES.map((template) => (
            <button
              className="rounded-xl border border-neon/20 bg-neon/5 p-3 text-left transition hover:border-neon/50 hover:bg-neon/10"
              key={template.id}
              onClick={() => applyTemplate(template)}
              type="button"
            >
              <span className="font-mono text-sm text-green-50">{template.label}</span>
              <span className="mt-2 block text-xs leading-5 text-green-100/60">
                {template.description}
              </span>
            </button>
          ))}
        </div>
      </section>

      <Field
        label="Campaign name"
        onChange={(value) => update("name", value)}
        placeholder="Obsidian presale"
        required
        value={form.name}
      />
      <Field
        label="Campaign slug"
        onChange={(value) => update("campaignId", slugify(value))}
        placeholder="obsidian-presale"
        required
        value={form.campaignId}
      />
      <div className="grid gap-3 md:grid-cols-2">
        <Field
          label="Min wallet age days"
          onChange={(value) => update("minWalletAgeDays", value)}
          type="number"
          value={form.minWalletAgeDays}
        />
        <Field
          label="Min tx count"
          onChange={(value) => update("minTxCount", value)}
          type="number"
          value={form.minTxCount}
        />
        <Field
          label="Min SOL balance"
          onChange={(value) => update("minSolBalance", value)}
          step="0.01"
          type="number"
          value={form.minSolBalance}
        />
        <Field
          label="Min estimated visible SOL movement"
          onChange={(value) => update("minVolume90dSol", value)}
          step="0.01"
          type="number"
          value={form.minVolume90dSol}
        />
        <Field
          label="Max registrations"
          onChange={(value) => update("maxRegistrations", value)}
          type="number"
          value={form.maxRegistrations}
        />
        <Field
          label="Expiry"
          onChange={(value) => update("expiresAt", value)}
          required
          type="datetime-local"
          value={form.expiresAt}
        />
      </div>
      <Field
        label="Webhook URL"
        onChange={(value) => update("webhookUrl", value)}
        placeholder="https://partner.app/webhook"
        value={form.webhookUrl}
      />
      <fieldset className="rounded-xl border border-neon/20 p-3">
        <legend className="px-2 font-mono text-xs uppercase tracking-[0.16em] text-neon">
          Allowed tiers
        </legend>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {TIER_OPTIONS.map(([tier, label]) => (
            <label className="flex items-center gap-2 text-sm text-green-100/80" key={tier}>
              <input
                checked={form.allowedTiers.includes(tier)}
                name="allowedTiers"
                onChange={(event) => {
                  const next = event.target.checked
                    ? [...form.allowedTiers, tier]
                    : form.allowedTiers.filter((selected) => selected !== tier);
                  update("allowedTiers", next.sort((left, right) => left - right));
                }}
                type="checkbox"
                value={tier}
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <section className="rounded-xl border border-neon/25 bg-black/70 p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-neon">
              Live qualification preview
            </p>
            <p className="mt-2 text-3xl font-semibold text-green-50">{preview.percent}%</p>
          </div>
          <div className="h-16 w-16 rounded-full border border-neon/40 p-2">
            <div
              className="h-full rounded-full bg-neon/80 shadow-neon"
              style={{ clipPath: `inset(${100 - preview.percent}% 0 0 0)` }}
            />
          </div>
        </div>
        <p className="mt-3 text-sm leading-6 text-green-100/70">
          {preview.percent}% of your audience would qualify based on these thresholds. This is a
          modeled UX estimate from policy strictness only; connect real audience analytics before
          treating it as a production forecast.
        </p>
        <p className="mt-2 text-xs text-green-100/50">{preview.summary}</p>
      </section>

      <button className="rounded-xl border border-neon/50 bg-neon/10 px-5 py-3 font-mono text-neon shadow-neon-soft transition hover:bg-neon/20">
        Launch Campaign
      </button>
      {status ? <p className="text-sm text-green-100/70">{status}</p> : null}
      {result ? (
        <div className="rounded-xl border border-neon/25 bg-black/70 p-4 text-sm">
          <p className="font-mono text-neon">{result.campaign.name}</p>
          <p className="mt-2 break-all">Policy hash: {result.campaign.policyHash}</p>
          <div className="mt-3 grid gap-2 rounded-xl border border-yellow-300/20 bg-yellow-300/5 p-3">
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-yellow-100">
              One-time API key
            </p>
            <code className="break-all text-yellow-100">
              {showCreatedApiKey ? result.apiKey : maskSecret(result.apiKey)}
            </code>
            <div className="flex flex-wrap gap-2">
              <button
                className="rounded-lg border border-yellow-200/30 px-3 py-1 text-yellow-100"
                onClick={() => setShowCreatedApiKey((visible) => !visible)}
                type="button"
              >
                {showCreatedApiKey ? "Hide" : "Reveal"}
              </button>
              <button
                className="rounded-lg border border-yellow-200/30 px-3 py-1 text-yellow-100"
                onClick={copyCreatedApiKey}
                type="button"
              >
                Copy
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </form>
  );
}

function Field({
  label,
  onChange,
  placeholder,
  required,
  step,
  type = "text",
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  step?: string;
  type?: string;
  value: string;
}) {
  return (
    <label className="grid gap-2 text-sm text-green-100/75">
      <span className="font-mono text-xs uppercase tracking-[0.16em] text-green-300/70">
        {label}
      </span>
      <input
        className="rounded-xl border border-neon/25 bg-black/70 px-3 py-2 text-green-50 outline-none transition focus:border-neon"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        step={step}
        type={type}
        value={value}
      />
    </label>
  );
}

function calculateAudiencePreview(form: CampaignDraft) {
  const agePenalty = Math.min(35, numberValue(form.minWalletAgeDays) / 12);
  const txPenalty = Math.min(28, numberValue(form.minTxCount) / 8);
  const balancePenalty = Math.min(18, numberValue(form.minSolBalance) * 18);
  const volumePenalty = Math.min(24, numberValue(form.minVolume90dSol) / 4);
  const tierPenalty = Math.max(0, 4 - form.allowedTiers.length) * 11;
  const capPenalty = form.maxRegistrations ? 6 : 0;
  const percent = Math.max(
    3,
    Math.min(98, Math.round(96 - agePenalty - txPenalty - balancePenalty - volumePenalty - tierPenalty - capPenalty)),
  );

  return {
    percent,
    summary: `Strictness inputs: ${numberValue(form.minWalletAgeDays)}d age, ${numberValue(
      form.minTxCount,
    )} tx, ${numberValue(form.minSolBalance)} SOL balance, ${numberValue(
      form.minVolume90dSol,
    )} SOL estimated visible movement, tiers ${form.allowedTiers.join(", ") || "none"}.`,
  };
}

function defaultExpiryLocal(daysFromNow: number) {
  const date = new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function maskSecret(value: string) {
  if (value.length <= 12) {
    return "••••••••";
  }

  return `${value.slice(0, 6)}••••••••••••${value.slice(-4)}`;
}

function numberValue(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
