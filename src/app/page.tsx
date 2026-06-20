import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { MorphCubeScene } from "@/components/MorphCubeScene";
import { ProofTimeline } from "@/components/ProofTimeline";
import { TerminalPanel } from "@/components/TerminalPanel";
import { WireframeCard } from "@/components/WireframeCard";

const sections = [
  ["Private Wallet Reputation", "Prove wallet age, activity, balance, and estimated visible SOL movement without handing partners your main wallet."],
  ["Morph Wallets", "Generate fresh purpose-specific Solana wallets locally, encrypt backups with WebCrypto, and register only the Morph Wallet."],
  ["Campaign Builder", "Partners define thresholds, issue API keys, register Morph Wallets, export whitelists, and receive webhooks."],
  ["Agent-Safe Wallets", "Isolate funds for AI agents with local signer policies that refuse transactions outside your constraints."],
  ["SDK/API", "Verify capsules locally or through BlockMorph APIs with deterministic policy hashes and Ed25519 signatures."],
  ["On-chain Morph Badges", "Optional devnet badge architecture mints only to Morph Wallets when enabled and properly configured."],
];

export default function Home() {
  return (
    <div className="mx-auto max-w-7xl px-5 py-16">
      <section className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <p className="font-mono text-sm uppercase tracking-[0.32em] text-neon">Prove the shape, hide the source.</p>
          <h1 className="mt-5 max-w-4xl font-mono text-5xl font-semibold tracking-tight text-green-50 md:text-7xl">
            Morph one Solana wallet into many private proof-identities.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-green-100/72">
            BlockMorph lets users prove wallet reputation or eligibility from a main Solana wallet, then morph that
            reputation into fresh campaign-specific Morph Wallets for presales, DAO gates, airdrops, and agent sessions.
          </p>
          <p className="mt-4 max-w-2xl rounded-xl border border-neon/20 bg-black/50 p-4 text-sm text-green-100/75">
            Partners never see your proving wallet. They only see your Morph Wallet, tier, campaign scope, and capsule
            validity. In issuer-signed mode, BlockMorph verifies the proving wallet to issue the capsule.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Cta href="/morph">Create Morph Capsule</Cta>
            <Cta href="/campaigns">Launch Campaign</Cta>
            <Cta href="/verify">Verify Capsule</Cta>
            <Cta href="/docs">View Docs</Cta>
          </div>
        </div>
        <MorphCubeScene />
      </section>

      <section className="mt-16">
        <ProofTimeline />
      </section>

      <section className="mt-16 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {sections.map(([title, copy]) => (
          <WireframeCard key={title}>
            <h2 className="font-mono text-xl text-neon">{title}</h2>
            <p className="mt-4 leading-7 text-green-100/72">{copy}</p>
          </WireframeCard>
        ))}
      </section>

      <section className="mt-16 grid gap-6 lg:grid-cols-2">
        <TerminalPanel title="Privacy model">
          <ul className="grid gap-3">
            <li>Your main wallet stays out of partner registrations and capsule JSON.</li>
            <li>Issuer-signed mode requires BlockMorph to see and verify the proving wallet during issuance.</li>
            <li>Advanced ZK Mode is documented as a future/root-based proof architecture unless real proofs are enabled.</li>
          </ul>
        </TerminalPanel>
        <TerminalPanel title="Local/devnet flow">
          <code className="block whitespace-pre-wrap text-neon/90">
            npm install{"\n"}npx prisma migrate dev{"\n"}npm run issuer:keys{"\n"}npm run db:seed{"\n"}npm run dev
          </code>
        </TerminalPanel>
      </section>
    </div>
  );
}

function Cta({ children, href }: { children: string; href: string }) {
  return (
    <Link
      className="inline-flex items-center gap-2 rounded-xl border border-neon/40 bg-neon/10 px-5 py-3 font-mono text-sm text-neon shadow-neon-soft transition hover:bg-neon/20"
      href={href}
    >
      {children}
      <ArrowRight size={16} />
    </Link>
  );
}
