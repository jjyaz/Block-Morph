import crypto from "node:crypto";

import bs58 from "bs58";
import nacl from "tweetnacl";

const keypair = nacl.sign.keyPair();
const pepper = crypto.randomBytes(32).toString("base64url");

console.log("Add these values to your .env file:");
console.log(`BLOCKMORPH_ISSUER_SECRET_KEY=${bs58.encode(keypair.secretKey)}`);
console.log(`BLOCKMORPH_ISSUER_PUBLIC_KEY=${bs58.encode(keypair.publicKey)}`);
console.log(`BLOCKMORPH_NULLIFIER_PEPPER=${pepper}`);
