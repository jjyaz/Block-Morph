-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "minWalletAgeDays" INTEGER NOT NULL,
    "minTxCount" INTEGER NOT NULL,
    "minSolBalance" REAL NOT NULL,
    "minVolume90dSol" REAL NOT NULL,
    "allowedTiersJson" TEXT NOT NULL DEFAULT '[1,2,3,4]',
    "maxRegistrations" INTEGER,
    "expiresAt" DATETIME NOT NULL,
    "webhookUrl" TEXT,
    "apiKeyHash" TEXT NOT NULL,
    "policyHash" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Registration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "morphWallet" TEXT NOT NULL,
    "capsuleId" TEXT NOT NULL,
    "nullifier" TEXT NOT NULL,
    "tier" INTEGER NOT NULL,
    "tierLabel" TEXT NOT NULL,
    "registeredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Registration_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("campaignId") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "IssuedCapsule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "capsuleId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "morphWallet" TEXT NOT NULL,
    "nullifier" TEXT NOT NULL,
    "tier" INTEGER NOT NULL,
    "tierLabel" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "issuedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IssuedCapsule_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("campaignId") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payloadJson" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WebhookEvent_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("campaignId") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChallengeNonce" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nonce" TEXT NOT NULL,
    "wallet" TEXT,
    "usedAt" DATETIME,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Campaign_campaignId_key" ON "Campaign"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "Registration_campaignId_morphWallet_key" ON "Registration"("campaignId", "morphWallet");

-- CreateIndex
CREATE UNIQUE INDEX "Registration_campaignId_nullifier_key" ON "Registration"("campaignId", "nullifier");

-- CreateIndex
CREATE UNIQUE INDEX "IssuedCapsule_capsuleId_key" ON "IssuedCapsule"("capsuleId");

-- CreateIndex
CREATE UNIQUE INDEX "IssuedCapsule_campaignId_nullifier_key" ON "IssuedCapsule"("campaignId", "nullifier");

-- CreateIndex
CREATE UNIQUE INDEX "ChallengeNonce_nonce_key" ON "ChallengeNonce"("nonce");
