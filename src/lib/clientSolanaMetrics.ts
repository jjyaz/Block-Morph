"use client";

import { Connection, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";

export type ClientWalletMetrics = {
  walletPublicKey: string;
  balanceSol: number;
  firstSeenAt: string | null;
  walletAgeDays: number;
  txCountEstimate: number;
  recentActivityCount: number;
  estimatedVisibleSolMovement90d: number;
  fetchedSignatureCount: number;
  capped: boolean;
};

const MAX_SIGNATURES = 200;
const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

export async function fetchClientWalletMetrics(walletPublicKey: string): Promise<ClientWalletMetrics> {
  const endpoint = process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
  const connection = new Connection(endpoint, "confirmed");
  const publicKey = new PublicKey(walletPublicKey);
  const [balanceLamports, signatures] = await Promise.all([
    connection.getBalance(publicKey, "confirmed"),
    connection.getSignaturesForAddress(publicKey, { limit: MAX_SIGNATURES }),
  ]);
  const now = Date.now();
  const blockTimes = signatures
    .map((signature) => signature.blockTime)
    .filter((blockTime): blockTime is number => typeof blockTime === "number")
    .sort((left, right) => left - right);
  const oldest = blockTimes[0];
  const recent30 = Math.floor(now / 1000) - 30 * 24 * 60 * 60;
  const recent90 = signatures.filter(
    (signature) =>
      typeof signature.blockTime === "number" && now - signature.blockTime * 1000 <= NINETY_DAYS_MS,
  );

  return {
    balanceSol: balanceLamports / LAMPORTS_PER_SOL,
    capped: signatures.length >= MAX_SIGNATURES,
    estimatedVisibleSolMovement90d: await estimateMovement(connection, publicKey, recent90.map((item) => item.signature)),
    fetchedSignatureCount: signatures.length,
    firstSeenAt: oldest ? new Date(oldest * 1000).toISOString() : null,
    recentActivityCount: signatures.filter((signature) => (signature.blockTime ?? 0) >= recent30).length,
    txCountEstimate: signatures.length,
    walletAgeDays: oldest ? Math.floor((now - oldest * 1000) / (24 * 60 * 60 * 1000)) : 0,
    walletPublicKey,
  };
}

async function estimateMovement(connection: Connection, publicKey: PublicKey, signatures: string[]) {
  const transactions = await connection.getParsedTransactions(signatures.slice(0, 40), {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0,
  });
  const wallet = publicKey.toBase58();
  let lamports = 0;

  for (const transaction of transactions) {
    if (!transaction?.meta) {
      continue;
    }

    const index = transaction.transaction.message.accountKeys.findIndex(
      (account) => account.pubkey.toBase58() === wallet,
    );
    if (index >= 0) {
      lamports += Math.abs((transaction.meta.postBalances[index] ?? 0) - (transaction.meta.preBalances[index] ?? 0));
    }
  }

  return lamports / LAMPORTS_PER_SOL;
}
