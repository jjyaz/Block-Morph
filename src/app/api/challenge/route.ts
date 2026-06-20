import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { randomNonce } from "@/lib/security";

export async function POST() {
  const nonce = randomNonce();
  const challenge = `BlockMorph verification challenge: ${nonce}`;

  await prisma.challengeNonce.create({
    data: {
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      nonce,
    },
  });

  return NextResponse.json({
    challenge,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    nonce,
  });
}
