import {
  Connection,
  LAMPORTS_PER_SOL,
  ParsedTransactionWithMeta,
  PublicKey,
} from "@solana/web3.js";

import { env } from "@/lib/env";
import type { WalletMetrics } from "@/lib/tiers";

const SIGNATURE_PAGE_LIMIT = 100;
const MAX_SIGNATURES = 500;
const PARSED_TX_BATCH = 20;
const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;
const THIRTY_DAYS_SECONDS = 30 * 24 * 60 * 60;

export function getSolanaConnection() {
  return new Connection(env.NEXT_PUBLIC_SOLANA_RPC_URL, "confirmed");
}

export async function fetchWalletMetrics(walletPublicKey: string): Promise<WalletMetrics> {
  const publicKey = new PublicKey(walletPublicKey);
  const connection = getSolanaConnection();
  const [balanceLamports, signatures] = await Promise.all([
    connection.getBalance(publicKey, "confirmed"),
    fetchSignatures(connection, publicKey),
  ]);

  const now = Date.now();
  const oldestBlockTime = signatures
    .map((signature) => signature.blockTime)
    .filter((blockTime): blockTime is number => typeof blockTime === "number")
    .sort((left, right) => left - right)[0];
  const firstSeenAt = oldestBlockTime ? new Date(oldestBlockTime * 1000).toISOString() : null;
  const walletAgeDays = oldestBlockTime
    ? Math.floor((now - oldestBlockTime * 1000) / (24 * 60 * 60 * 1000))
    : 0;
  const recentCutoff = Math.floor(now / 1000) - THIRTY_DAYS_SECONDS;
  const recentActivityCount = signatures.filter(
    (signature) => (signature.blockTime ?? 0) >= recentCutoff,
  ).length;
  const recent90dSignatures = signatures.filter(
    (signature) =>
      typeof signature.blockTime === "number" && now - signature.blockTime * 1000 <= NINETY_DAYS_MS,
  );

  const estimatedVisibleSolMovement90d = await estimateVisibleSolMovement(
    connection,
    publicKey,
    recent90dSignatures.map((signature) => signature.signature),
  );

  return {
    balanceSol: balanceLamports / LAMPORTS_PER_SOL,
    capped: signatures.length >= MAX_SIGNATURES,
    estimatedVisibleSolMovement90d,
    fetchedSignatureCount: signatures.length,
    firstSeenAt,
    recentActivityCount,
    txCountEstimate: signatures.length,
    walletAgeDays,
    walletPublicKey,
  };
}

async function fetchSignatures(connection: Connection, publicKey: PublicKey) {
  const signatures = [];
  let before: string | undefined;

  while (signatures.length < MAX_SIGNATURES) {
    const page = await connection.getSignaturesForAddress(publicKey, {
      before,
      limit: SIGNATURE_PAGE_LIMIT,
    });

    signatures.push(...page);
    if (page.length < SIGNATURE_PAGE_LIMIT) {
      break;
    }

    before = page[page.length - 1]?.signature;
  }

  return signatures.slice(0, MAX_SIGNATURES);
}

async function estimateVisibleSolMovement(
  connection: Connection,
  publicKey: PublicKey,
  signatures: string[],
) {
  let totalLamports = 0;
  const wallet = publicKey.toBase58();

  for (let index = 0; index < signatures.length; index += PARSED_TX_BATCH) {
    const batch = signatures.slice(index, index + PARSED_TX_BATCH);
    const transactions = await connection.getParsedTransactions(batch, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });

    for (const transaction of transactions) {
      totalLamports += Math.abs(getWalletLamportDelta(transaction, wallet));
    }
  }

  return totalLamports / LAMPORTS_PER_SOL;
}

function getWalletLamportDelta(transaction: ParsedTransactionWithMeta | null, wallet: string) {
  if (!transaction?.meta) {
    return 0;
  }

  const accountIndex = transaction.transaction.message.accountKeys.findIndex(
    (account) => account.pubkey.toBase58() === wallet,
  );

  if (accountIndex < 0) {
    return 0;
  }

  const pre = transaction.meta.preBalances[accountIndex] ?? 0;
  const post = transaction.meta.postBalances[accountIndex] ?? 0;
  return post - pre;
}
