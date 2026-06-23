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

const tokenUtilities = [
  {
    title: "Staking escrow",
    copy:
      "Campaigns can require partners to escrow $MORPH before issuing gated access. Escrowed stake creates an economic bond for allowlists, drops, and partner integrations without exposing users' proving wallets.",
  },
  {
    title: "Fee abstraction",
    copy:
      "$MORPH can sponsor or settle verification, registration, and SDK usage fees behind the scenes so users interact with Morph Wallets while partners handle campaign-level economics.",
  },
  {
    title: "Token balance gating",
    copy:
      "A future ZK balance gate can prove a wallet satisfies a $MORPH threshold without sending the proving wallet or exact balance to partners. Until a real verifier is live, issuer-signed capsules remain the production path.",
  },
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

      <section className="mt-16 overflow-hidden rounded-[2rem] border border-neon/25 bg-black/70 p-6 shadow-neon-soft md:p-8">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="font-mono text-sm uppercase tracking-[0.28em] text-neon">
              $MORPH token integration
            </p>
            <h2 className="mt-4 font-mono text-3xl font-semibold text-green-50 md:text-5xl">
              Token utility for private access markets.
            </h2>
            <p className="mt-5 leading-8 text-green-100/72">
              $MORPH is designed as the economic layer around BlockMorph capsules: partner stake,
              fee abstraction, and token-aware gates can plug into the same privacy-preserving
              Morph Wallet flow. Token features should be treated as architecture until deployed
              contracts and verifiers are live.
            </p>
            <div className="mt-6 grid gap-4">
              {tokenUtilities.map((utility) => (
                <div className="rounded-2xl border border-neon/20 bg-neon/5 p-4" key={utility.title}>
                  <h3 className="font-mono text-lg text-neon">{utility.title}</h3>
                  <p className="mt-2 leading-7 text-green-100/70">{utility.copy}</p>
                </div>
              ))}
            </div>
          </div>
          <ZkTokenDiagram />
        </div>
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

function ZkTokenDiagram() {
  const nodes = [
    {
      label: "Proving wallet",
      detail: "$MORPH balance + reputation",
    },
    {
      label: "ZK circuit",
      detail: "Prove threshold, hide wallet and exact balance",
    },
    {
      label: "Capsule",
      detail: "Tier, policy hash, campaign scope",
    },
    {
      label: "Morph Wallet",
      detail: "Partner-facing access identity",
    },
  ];

  return (
    <div className="relative rounded-[1.5rem] border border-neon/25 bg-[#030603] p-5">
      <div className="absolute inset-0 bg-neon-grid bg-[length:28px_28px] opacity-40" />
      <div className="relative">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-green-300/70">
              ZK balance gate
            </p>
            <h3 className="mt-2 font-mono text-2xl text-green-50">Private token proof path</h3>
          </div>
          <div className="rounded-full border border-neon/30 px-3 py-1 font-mono text-sm text-neon">
            $MORPH
          </div>
        </div>

        <div className="grid gap-3">
          {nodes.map((node, index) => (
            <div className="relative" key={node.label}>
              <div className="rounded-2xl border border-neon/30 bg-black/70 p-4 shadow-neon-soft">
                <div className="flex items-start gap-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-neon/40 font-mono text-xs text-neon">
                    0{index + 1}
                  </span>
                  <div>
                    <p className="font-mono text-lg text-green-50">{node.label}</p>
                    <p className="mt-1 text-sm leading-6 text-green-100/65">{node.detail}</p>
                  </div>
                </div>
              </div>
              {index < nodes.length - 1 ? (
                <div className="mx-8 h-6 border-l border-dashed border-neon/45" />
              ) : null}
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-2xl border border-neon/20 bg-neon/5 p-4">
          <p className="font-mono text-sm text-neon">Public outputs</p>
          <p className="mt-2 text-sm leading-6 text-green-100/70">
            threshold passed, campaign ID, policy hash, Morph Wallet, expiry. Not public:
            proving wallet, exact $MORPH balance, or token transaction graph.
          </p>
        </div>
      </div>
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
