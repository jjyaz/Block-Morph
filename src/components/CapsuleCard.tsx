import type { BlockMorphCapsule } from "@blockmorph/sdk";

import { WireframeCard } from "@/components/WireframeCard";

export function CapsuleCard({ capsule }: { capsule: BlockMorphCapsule }) {
  return (
    <WireframeCard>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-neon">Capsule</p>
          <h3 className="mt-2 break-all font-mono text-lg text-green-50">{capsule.capsuleId}</h3>
        </div>
        <span className="rounded-full border border-neon/30 px-3 py-1 font-mono text-sm text-neon">
          {capsule.tierLabel}
        </span>
      </div>
      <dl className="mt-5 grid gap-3 text-sm text-green-100/75">
        <Row label="Campaign" value={capsule.campaignId} />
        <Row label="Morph Wallet" value={capsule.morphWallet} />
        <Row label="Nullifier" value={capsule.nullifier} />
        <Row label="Policy Hash" value={capsule.policyHash} />
        <Row label="Expires" value={new Date(capsule.expiresAt).toLocaleString()} />
      </dl>
    </WireframeCard>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1">
      <dt className="font-mono text-xs uppercase tracking-[0.16em] text-green-300/60">{label}</dt>
      <dd className="break-all text-green-50/90">{value}</dd>
    </div>
  );
}
