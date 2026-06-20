"use client";

import { FormEvent, useState } from "react";

export function VerifierPanel() {
  const [json, setJson] = useState("");
  const [minTier, setMinTier] = useState("1");
  const [result, setResult] = useState<Record<string, unknown> | null>(null);

  async function verify(event: FormEvent) {
    event.preventDefault();
    setResult({ status: "Verifying..." });
    try {
      const capsule = JSON.parse(json);
      const response = await fetch("/api/capsule/verify", {
        body: JSON.stringify({ capsule, minTier: Number(minTier) }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      setResult(await response.json());
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : "Invalid JSON", valid: false });
    }
  }

  return (
    <form className="grid gap-4" onSubmit={verify}>
      <label className="grid gap-2 text-sm text-green-100/75">
        <span className="font-mono text-xs uppercase tracking-[0.16em] text-green-300/70">
          Capsule JSON
        </span>
        <textarea
          className="min-h-64 rounded-xl border border-neon/25 bg-black/80 p-3 font-mono text-xs text-green-50 outline-none transition focus:border-neon"
          onChange={(event) => setJson(event.target.value)}
          placeholder="{ ... }"
          value={json}
        />
      </label>
      <label className="grid gap-2 text-sm text-green-100/75 md:w-48">
        <span className="font-mono text-xs uppercase tracking-[0.16em] text-green-300/70">
          Minimum tier
        </span>
        <select
          className="rounded-xl border border-neon/25 bg-black/80 p-3 text-green-50"
          onChange={(event) => setMinTier(event.target.value)}
          value={minTier}
        >
          <option value="1">BRONZE</option>
          <option value="2">SILVER</option>
          <option value="3">GOLD</option>
          <option value="4">OBSIDIAN</option>
        </select>
      </label>
      <button className="rounded-xl border border-neon/50 bg-neon/10 px-5 py-3 font-mono text-neon shadow-neon-soft">
        Verify Capsule
      </button>
      {result ? (
        <pre className="max-h-96 overflow-auto rounded-xl border border-neon/20 bg-black/80 p-4 text-xs text-green-100">
          {JSON.stringify(result, null, 2)}
        </pre>
      ) : null}
    </form>
  );
}
