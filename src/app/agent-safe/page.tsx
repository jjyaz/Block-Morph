"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { Connection, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { FormEvent, useState } from "react";

import { MorphWalletVault } from "@/components/MorphWalletVault";
import { TerminalPanel } from "@/components/TerminalPanel";
import { WalletConnectButton } from "@/components/WalletConnectButton";
import { WireframeCard } from "@/components/WireframeCard";

type AgentPolicy = {
  type: "blockmorph_agent_policy_v1";
  morphWallet: string;
  maxSolToFund: number;
  allowedProgramIds: string[];
  allowedDestinationWallets: string[];
  dailySpendLimitSol: number;
  expiresAt: string;
  humanApprovalRequired: boolean;
};

export default function AgentSafePage() {
  const wallet = useWallet();
  const [morphWallet, setMorphWallet] = useState("");
  const [policy, setPolicy] = useState<AgentPolicy | null>(null);
  const [fundingTx, setFundingTx] = useState("");
  const [builderStatus, setBuilderStatus] = useState("");

  async function createPolicy(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const nextPolicy: AgentPolicy = {
      allowedDestinationWallets: String(form.get("allowedDestinationWallets") ?? "")
        .split("\n")
        .map((value) => value.trim())
        .filter(Boolean),
      allowedProgramIds: String(form.get("allowedProgramIds") ?? "")
        .split("\n")
        .map((value) => value.trim())
        .filter(Boolean),
      dailySpendLimitSol: Number(form.get("dailySpendLimitSol")),
      expiresAt: new Date(String(form.get("expiresAt"))).toISOString(),
      humanApprovalRequired: form.get("humanApprovalRequired") === "on",
      maxSolToFund: Number(form.get("maxSolToFund")),
      morphWallet,
      type: "blockmorph_agent_policy_v1",
    };
    setPolicy(nextPolicy);
    await buildFundingTransaction(nextPolicy);
  }

  async function buildFundingTransaction(nextPolicy: AgentPolicy) {
    if (!wallet.publicKey || !nextPolicy.morphWallet || nextPolicy.maxSolToFund <= 0) {
      return;
    }
    const connection = new Connection(
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.devnet.solana.com",
      "confirmed",
    );
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    const transaction = new Transaction({
      blockhash,
      feePayer: wallet.publicKey,
      lastValidBlockHeight,
    }).add(
      SystemProgram.transfer({
        fromPubkey: wallet.publicKey,
        lamports: Math.round(nextPolicy.maxSolToFund * LAMPORTS_PER_SOL),
        toPubkey: new PublicKey(nextPolicy.morphWallet),
      }),
    );
    setFundingTx(base64(transaction.serializeMessage()));
  }

  function exportJson(name: string, value: unknown) {
    const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = name;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function testTransferBuilder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!policy) {
      setBuilderStatus("Create a policy first.");
      return;
    }
    const form = new FormData(event.currentTarget);
    const destination = String(form.get("destination"));
    const programId = String(form.get("programId"));
    const amountSol = Number(form.get("amountSol"));

    if (new Date(policy.expiresAt).getTime() <= Date.now()) {
      setBuilderStatus("Refused: policy is expired.");
      return;
    }
    if (!policy.allowedDestinationWallets.includes(destination)) {
      setBuilderStatus("Refused: destination wallet is not allowed.");
      return;
    }
    if (!policy.allowedProgramIds.includes(programId)) {
      setBuilderStatus("Refused: program ID is not allowed.");
      return;
    }
    if (amountSol > policy.dailySpendLimitSol) {
      setBuilderStatus("Refused: transfer exceeds daily spend limit.");
      return;
    }
    if (policy.humanApprovalRequired) {
      setBuilderStatus("Prepared but not signed: human approval is required.");
      return;
    }
    setBuilderStatus("Transfer request passes local BlockMorph policy checks.");
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-mono text-sm uppercase tracking-[0.24em] text-neon">Agent-Safe Wallets</p>
          <h1 className="mt-3 font-mono text-4xl text-green-50">One wallet. Infinite morphs. Bounded agent risk.</h1>
        </div>
        <WalletConnectButton />
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <WireframeCard>
          <MorphWalletVault onWalletGenerated={(publicKey) => setMorphWallet(publicKey)} />
          <form className="mt-6 grid gap-4" onSubmit={createPolicy}>
            <Field label="Max SOL to fund" name="maxSolToFund" type="number" value="0.1" />
            <TextArea label="Allowed program IDs" name="allowedProgramIds" value="11111111111111111111111111111111" />
            <TextArea label="Allowed destination wallets" name="allowedDestinationWallets" value={morphWallet} />
            <Field label="Daily spend limit SOL" name="dailySpendLimitSol" type="number" value="0.05" />
            <Field label="Expiry" name="expiresAt" type="datetime-local" value={defaultExpiryLocal()} />
            <label className="flex items-center gap-2 text-sm text-green-100/75">
              <input defaultChecked name="humanApprovalRequired" type="checkbox" />
              Human approval required
            </label>
            <button className="rounded-xl border border-neon/50 bg-neon/10 px-5 py-3 font-mono text-neon">
              Create Agent Policy
            </button>
          </form>
        </WireframeCard>
        <div className="grid gap-6">
          <TerminalPanel title="Security limitation">
            Solana does not natively enforce arbitrary wallet policies. BlockMorph limits risk by isolating funds inside
            a separate Morph Wallet and enforcing policies in the BlockMorph signer UI/SDK.
          </TerminalPanel>
          {policy ? (
            <WireframeCard>
              <h2 className="font-mono text-xl text-neon">Agent session exports</h2>
              <pre className="mt-4 max-h-64 overflow-auto rounded-xl bg-black/70 p-3 text-xs">
                {JSON.stringify(policy, null, 2)}
              </pre>
              <p className="mt-4 break-all text-sm text-green-100/75">
                Funding transaction message (base64): {fundingTx || "Connect wallet and set funding amount."}
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <button className="rounded-xl border border-neon/30 px-4 py-2 text-neon" onClick={() => exportJson("agent-policy.json", policy)} type="button">
                  Export policy JSON
                </button>
                <button
                  className="rounded-xl border border-neon/30 px-4 py-2 text-neon"
                  onClick={() =>
                    exportJson("agent-session-descriptor.json", {
                      expiresAt: policy.expiresAt,
                      morphWallet: policy.morphWallet,
                      policyType: policy.type,
                    })
                  }
                  type="button"
                >
                  Export public descriptor
                </button>
              </div>
            </WireframeCard>
          ) : null}
          <WireframeCard>
            <h2 className="font-mono text-xl text-neon">Local transaction builder</h2>
            <form className="mt-4 grid gap-3" onSubmit={testTransferBuilder}>
              <Field label="Program ID" name="programId" value="11111111111111111111111111111111" />
              <Field label="Destination wallet" name="destination" value={morphWallet} />
              <Field label="Amount SOL" name="amountSol" type="number" value="0.01" />
              <button className="rounded-xl border border-neon/30 px-4 py-2 text-neon">
                Check transaction policy
              </button>
            </form>
            {builderStatus ? <p className="mt-3 text-sm text-green-100/75">{builderStatus}</p> : null}
          </WireframeCard>
        </div>
      </div>
    </div>
  );
}

function Field({ label, name, type = "text", value }: { label: string; name: string; type?: string; value?: string }) {
  return (
    <label className="grid gap-2 text-sm text-green-100/75">
      <span className="font-mono text-xs uppercase tracking-[0.16em] text-green-300/70">{label}</span>
      <input className="rounded-xl border border-neon/25 bg-black/80 p-3" defaultValue={value} name={name} step="0.001" type={type} />
    </label>
  );
}

function TextArea({ label, name, value }: { label: string; name: string; value?: string }) {
  return (
    <label className="grid gap-2 text-sm text-green-100/75">
      <span className="font-mono text-xs uppercase tracking-[0.16em] text-green-300/70">{label}</span>
      <textarea className="min-h-24 rounded-xl border border-neon/25 bg-black/80 p-3 font-mono text-xs" defaultValue={value} name={name} />
    </label>
  );
}

function defaultExpiryLocal() {
  const date = new Date(Date.now() + 24 * 60 * 60 * 1000);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function base64(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes));
}
