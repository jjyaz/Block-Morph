import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

import { campaignPolicyHash } from "../src/lib/campaigns";
import { generateApiKey, hashApiKey } from "../src/lib/security";

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL ?? "file:./dev.db",
  }),
});

async function main() {
  const apiKey = generateApiKey();
  const expiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
  const campaignId = "general-reputation";
  const policyHash = campaignPolicyHash({
    allowedTiers: [1, 2, 3, 4],
    campaignId,
    expiresAt,
    maxRegistrations: null,
    minSolBalance: 0,
    minTxCount: 0,
    minVolume90dSol: 0,
    minWalletAgeDays: 0,
  });

  await prisma.campaign.upsert({
    create: {
      allowedTiersJson: JSON.stringify([1, 2, 3, 4]),
      apiKeyHash: hashApiKey(apiKey),
      campaignId,
      expiresAt,
      minSolBalance: 0,
      minTxCount: 0,
      minVolume90dSol: 0,
      minWalletAgeDays: 0,
      name: "General reputation capsule",
      policyHash,
    },
    update: {
      allowedTiersJson: JSON.stringify([1, 2, 3, 4]),
      enabled: true,
      expiresAt,
      policyHash,
    },
    where: { campaignId },
  });

  console.log(`Seeded demo campaign: ${campaignId}`);
  console.log(`Demo campaign API key (store now): ${apiKey}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
