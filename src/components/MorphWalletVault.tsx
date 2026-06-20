"use client";

import { Keypair } from "@solana/web3.js";
import { useState } from "react";

type BackupJson = {
  type: "blockmorph_encrypted_morph_wallet_v1";
  kdf: "PBKDF2-SHA256";
  iterations: number;
  salt: string;
  iv: string;
  ciphertext: string;
  publicKey: string;
  createdAt: string;
};

export function MorphWalletVault({
  onWalletGenerated,
}: {
  onWalletGenerated: (publicKey: string, backup: BackupJson) => void;
}) {
  const [password, setPassword] = useState("");
  const [backup, setBackup] = useState<BackupJson | null>(null);
  const [status, setStatus] = useState("");

  async function generate() {
    if (password.length < 8) {
      setStatus("Use at least 8 characters for the local encryption password.");
      return;
    }

    const keypair = Keypair.generate();
    const encrypted = await encryptSecretKey(keypair.secretKey, password, keypair.publicKey.toBase58());
    setBackup(encrypted);
    onWalletGenerated(keypair.publicKey.toBase58(), encrypted);
    setStatus("Morph Wallet generated locally. The secret key was not sent to BlockMorph.");
  }

  function exportBackup() {
    if (!backup) {
      return;
    }

    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `blockmorph-${backup.publicKey}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="grid gap-3">
      <label className="grid gap-2 text-sm text-green-100/75">
        <span className="font-mono text-xs uppercase tracking-[0.16em] text-green-300/70">
          Local vault password
        </span>
        <input
          className="rounded-xl border border-neon/25 bg-black/70 px-3 py-2 text-green-50 outline-none transition focus:border-neon"
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Encrypt Morph Wallet backup"
          type="password"
          value={password}
        />
      </label>
      <div className="flex flex-wrap gap-3">
        <button
          className="rounded-xl border border-neon/50 bg-neon/10 px-4 py-2 font-mono text-sm text-neon"
          onClick={generate}
          type="button"
        >
          Generate Morph Wallet
        </button>
        <button
          className="rounded-xl border border-neon/25 px-4 py-2 font-mono text-sm text-green-100 disabled:opacity-40"
          disabled={!backup}
          onClick={exportBackup}
          type="button"
        >
          Export encrypted backup JSON
        </button>
      </div>
      {backup ? <p className="break-all text-sm text-green-100/80">Morph Wallet: {backup.publicKey}</p> : null}
      {status ? <p className="text-sm text-green-100/60">{status}</p> : null}
    </div>
  );
}

async function encryptSecretKey(secretKey: Uint8Array, password: string, publicKey: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = secretKey.buffer.slice(
    secretKey.byteOffset,
    secretKey.byteOffset + secretKey.byteLength,
  ) as ArrayBuffer;
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  const key = await crypto.subtle.deriveKey(
    {
      hash: "SHA-256",
      iterations: 250_000,
      name: "PBKDF2",
      salt,
    },
    keyMaterial,
    { length: 256, name: "AES-GCM" },
    false,
    ["encrypt"],
  );
  const ciphertext = await crypto.subtle.encrypt(
    {
      iv,
      name: "AES-GCM",
    },
    key,
    plaintext,
  );

  return {
    ciphertext: base64(new Uint8Array(ciphertext)),
    createdAt: new Date().toISOString(),
    iterations: 250_000,
    iv: base64(iv),
    kdf: "PBKDF2-SHA256" as const,
    publicKey,
    salt: base64(salt),
    type: "blockmorph_encrypted_morph_wallet_v1" as const,
  };
}

function base64(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes));
}
