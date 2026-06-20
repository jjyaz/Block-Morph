# BlockMorph

BlockMorph is a privacy-preserving Solana identity and access layer. It lets users prove wallet reputation or campaign eligibility from a main Solana wallet, then morph that reputation into fresh purpose-specific Morph Wallets.

The app ships a real local/devnet issuer-signed flow:

- Solana wallet connection through Phantom and Solflare adapters.
- Real RPC reads for balance, signatures, first-seen approximation, recent activity, and estimated visible SOL movement.
- Replay-protected wallet challenge signing.
- Browser-only Morph Wallet keypair generation and AES-GCM encrypted backup export.
- Server-side Ed25519 BlockMorph Capsule signing.
- Campaign creation, API-key hashing, private Morph Wallet registration, whitelist export, and webhooks.
- Public capsule verification API and UI.
- Local SDK package at `packages/blockmorph-sdk`.

## Quick start

```bash
npm install
npx prisma migrate dev
npm run issuer:keys
```

Copy the printed issuer values into `.env`, then seed a demo campaign and start the app:

```bash
npm run db:seed
npm run dev
```

Open `http://localhost:3000`.

## Environment

Copy `.env.example` to `.env`.

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
BLOCKMORPH_ISSUER_SECRET_KEY=
BLOCKMORPH_ISSUER_PUBLIC_KEY=
BLOCKMORPH_NULLIFIER_PEPPER=
DATABASE_URL=file:./dev.db
NEXT_PUBLIC_MORPH_BADGE_ENABLED=false
BLOCKMORPH_DEV_MODE=false
BLOCKMORPH_DEV_SKIP_ZK=false
```

## Privacy model

Partners never see your proving wallet. They only see your Morph Wallet, tier, campaign scope, and capsule validity.

In issuer-signed mode, BlockMorph does see and verify the proving wallet during capsule issuance. Capsule JSON intentionally does not include the proving wallet.

## Security limitations

- Solana RPC transaction counts and wallet age are approximations bounded by fetched signatures.
- 90-day volume is labeled as estimated visible SOL movement because exact historical volume usually requires an indexer.
- Solana does not natively enforce arbitrary agent wallet policies. BlockMorph limits risk by isolating funds in a Morph Wallet and enforcing policies in the signer UI/SDK.
- ZK mode is scaffolded only. It is not presented as live until a real Noir/Barretenberg proof and verifier are integrated.

## SDK example

```ts
import { parseCapsuleJson, verifyCapsule } from "@blockmorph/sdk";

const capsule = parseCapsuleJson(json);
const result = verifyCapsule(capsule, {
  issuerPublicKey: process.env.BLOCKMORPH_ISSUER_PUBLIC_KEY,
  minTier: 2,
});
```

## Scripts

- `npm run dev` - run Next.js.
- `npm run build` - generate Prisma client and build Next.js.
- `npm run test` - run Vitest tests.
- `npm run issuer:keys` - generate issuer Ed25519 keys and nullifier pepper.
- `npm run db:seed` - create a demo `general-reputation` campaign.

## API routes

- `GET /api/issuer`
- `POST /api/challenge`
- `POST /api/capsule/issue`
- `POST /api/capsule/verify`
- `POST /api/campaigns`
- `GET /api/campaigns/:campaignId/whitelist`
- `POST /api/campaigns/:campaignId/register`
- `POST /api/webhooks/test`
