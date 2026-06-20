import { NextResponse } from "next/server";

import { env } from "@/lib/env";
import { POLICY_VERSION } from "@blockmorph/sdk";

export async function GET() {
  return NextResponse.json({
    issuer: "BlockMorph",
    issuerPublicKey: env.BLOCKMORPH_ISSUER_PUBLIC_KEY ?? null,
    policyVersion: POLICY_VERSION,
    proofModes: ["issuer-signed"],
    zkStatus: "skeleton-only",
  });
}
