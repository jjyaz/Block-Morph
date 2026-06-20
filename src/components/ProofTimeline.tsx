const steps = ["Main Wallet", "Proof", "Capsule", "Morph Wallet", "Campaign Access"];

export function ProofTimeline() {
  return (
    <div className="grid gap-3 md:grid-cols-5">
      {steps.map((step, index) => (
        <div
          className="relative rounded-xl border border-neon/25 bg-black/60 p-4 font-mono text-sm text-green-50"
          key={step}
        >
          <span className="mb-3 block text-xs text-neon">0{index + 1}</span>
          {step}
          {index < steps.length - 1 ? (
            <span className="absolute -right-3 top-1/2 hidden h-px w-6 bg-neon/40 md:block" />
          ) : null}
        </div>
      ))}
    </div>
  );
}
