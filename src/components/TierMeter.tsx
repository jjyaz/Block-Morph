import { TIER_LABELS } from "@blockmorph/sdk";

export function TierMeter({ tier }: { tier: number }) {
  return (
    <div className="grid gap-3">
      <div className="flex justify-between font-mono text-xs uppercase tracking-[0.16em] text-green-100/60">
        <span>Tier</span>
        <span>{TIER_LABELS[Math.max(1, Math.min(4, tier)) - 1]}</span>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {TIER_LABELS.map((label, index) => (
          <div
            className={`h-2 rounded-full ${
              index < tier ? "bg-neon shadow-neon" : "bg-green-200/10"
            }`}
            key={label}
          />
        ))}
      </div>
    </div>
  );
}
