import { TerminalPanel } from "@/components/TerminalPanel";
import { VerifierPanel } from "@/components/VerifierPanel";
import { WireframeCard } from "@/components/WireframeCard";

export default function VerifyPage() {
  return (
    <div className="mx-auto max-w-5xl px-5 py-12">
      <p className="font-mono text-sm uppercase tracking-[0.24em] text-neon">Public Verifier</p>
      <h1 className="mt-3 font-mono text-4xl text-green-50">Verify capsule validity, not main-wallet identity.</h1>
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.75fr]">
        <WireframeCard>
          <VerifierPanel />
        </WireframeCard>
        <TerminalPanel title="Verifier checks">
          <ul className="grid gap-3">
            <li>Schema valid</li>
            <li>Issuer signature valid and trusted issuer key matches</li>
            <li>Capsule and campaign are not expired</li>
            <li>Campaign exists and policy hash matches</li>
            <li>Tier satisfies the selected minimum tier</li>
            <li>Main wallet is not present in capsule JSON</li>
          </ul>
        </TerminalPanel>
      </div>
    </div>
  );
}
