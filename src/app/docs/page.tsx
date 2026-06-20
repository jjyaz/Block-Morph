import { TerminalPanel } from "@/components/TerminalPanel";
import { WireframeCard } from "@/components/WireframeCard";

const apiRows = [
  ["GET /api/issuer", "Returns issuer public key and policy version."],
  ["POST /api/challenge", "Creates a replay-protected wallet-signing challenge nonce."],
  ["POST /api/capsule/issue", "Verifies wallet signature, reads Solana metrics, signs a capsule."],
  ["POST /api/capsule/verify", "Verifies schema, signature, expiry, campaign, policy hash, and tier."],
  ["POST /api/campaigns", "Creates campaign and returns the API key once."],
  ["GET /api/campaigns/:campaignId/whitelist", "Bearer API key protected Morph Wallet whitelist export."],
  ["POST /api/campaigns/:campaignId/register", "Registers a verified Morph Wallet capsule."],
  ["POST /api/webhooks/test", "Sends a sample webhook payload."],
];

export default function DocsPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <p className="font-mono text-sm uppercase tracking-[0.24em] text-neon">Developer Docs</p>
      <h1 className="mt-3 font-mono text-4xl text-green-50">Build with private Solana proof-identities.</h1>
      <div className="mt-8 grid gap-6">
        <TerminalPanel title="Install and run">
          <code className="whitespace-pre-wrap text-neon/90">
            npm install{"\n"}npx prisma migrate dev{"\n"}npm run issuer:keys{"\n"}npm run db:seed{"\n"}npm run dev
          </code>
        </TerminalPanel>
        <WireframeCard>
          <h2 className="font-mono text-2xl text-neon">SDK</h2>
          <pre className="mt-4 overflow-auto rounded-xl bg-black/70 p-4 text-sm text-green-100">
{`import { parseCapsuleJson, verifyCapsule } from "@blockmorph/sdk";

const capsule = parseCapsuleJson(json);
const result = verifyCapsule(capsule, {
  issuerPublicKey: process.env.BLOCKMORPH_ISSUER_PUBLIC_KEY,
  minTier: 2,
});`}
          </pre>
        </WireframeCard>
        <div className="grid gap-6 lg:grid-cols-2">
          <WireframeCard>
            <h2 className="font-mono text-2xl text-neon">API reference</h2>
            <div className="mt-4 grid gap-3">
              {apiRows.map(([route, copy]) => (
                <div className="rounded-xl border border-neon/15 bg-black/60 p-3" key={route}>
                  <p className="font-mono text-sm text-neon">{route}</p>
                  <p className="mt-1 text-sm text-green-100/70">{copy}</p>
                </div>
              ))}
            </div>
          </WireframeCard>
          <WireframeCard>
            <h2 className="font-mono text-2xl text-neon">Environment variables</h2>
            <pre className="mt-4 overflow-auto rounded-xl bg-black/70 p-4 text-xs text-green-100">
{`NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
BLOCKMORPH_ISSUER_SECRET_KEY=
BLOCKMORPH_ISSUER_PUBLIC_KEY=
BLOCKMORPH_NULLIFIER_PEPPER=
DATABASE_URL=file:./dev.db
NEXT_PUBLIC_MORPH_BADGE_ENABLED=false
BLOCKMORPH_DEV_MODE=false
BLOCKMORPH_DEV_SKIP_ZK=false`}
            </pre>
          </WireframeCard>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <TerminalPanel title="Privacy model">
            In issuer-signed mode, BlockMorph verifies the proving wallet before issuing a capsule. Partners never see
            the proving wallet; they receive the Morph Wallet, tier, campaign ID, nullifier, policy hash, expiry, and
            issuer signature. Capsules intentionally do not contain the main wallet.
          </TerminalPanel>
          <TerminalPanel title="Security limitations">
            Solana RPC metric reads are estimates bounded by fetched signatures and visible parsed transactions. Agent
            wallet policies are enforced by the BlockMorph signer UI/SDK, not by Solana consensus. Keep encrypted Morph
            Wallet backups safe and never paste secret keys into partner apps.
          </TerminalPanel>
        </div>
        <WireframeCard>
          <h2 className="font-mono text-2xl text-neon">Advanced ZK Mode architecture</h2>
          <p className="mt-4 leading-7 text-green-100/75">
            The current implementation ships real issuer-signed capsules. The ZK module scaffold is reserved for a
            future Noir/Barretenberg circuit that proves private metric thresholds against public campaign policies or
            root-based attestations. Dev skip flags must be displayed as dev proof mode and are never production ZK.
          </p>
        </WireframeCard>
      </div>
    </div>
  );
}
