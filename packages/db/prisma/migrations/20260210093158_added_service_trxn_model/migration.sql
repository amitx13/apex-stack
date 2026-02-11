-- CreateEnum
CREATE TYPE "ServiceType" AS ENUM ('MOBILE_PREPAID', 'DTH', 'ELECTRICITY', 'GAS', 'WATER');

-- CreateEnum
CREATE TYPE "ServiceStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED');

-- CreateTable
CREATE TABLE "ServiceTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "serviceType" "ServiceType" NOT NULL,
    "operatorName" TEXT NOT NULL,
    "operatorCode" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "mobileNumber" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "imwalletTxnId" TEXT,
    "operatorTxnId" TEXT,
    "imwalletResponse" JSONB,
    "status" "ServiceStatus" NOT NULL DEFAULT 'PENDING',
    "commission" DECIMAL(10,2),
    "walletTransactionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ServiceTransaction_orderId_key" ON "ServiceTransaction"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceTransaction_imwalletTxnId_key" ON "ServiceTransaction"("imwalletTxnId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceTransaction_walletTransactionId_key" ON "ServiceTransaction"("walletTransactionId");

-- CreateIndex
CREATE INDEX "ServiceTransaction_userId_idx" ON "ServiceTransaction"("userId");

-- CreateIndex
CREATE INDEX "ServiceTransaction_orderId_idx" ON "ServiceTransaction"("orderId");

-- CreateIndex
CREATE INDEX "ServiceTransaction_status_idx" ON "ServiceTransaction"("status");

-- CreateIndex
CREATE INDEX "ServiceTransaction_createdAt_idx" ON "ServiceTransaction"("createdAt");

-- AddForeignKey
ALTER TABLE "ServiceTransaction" ADD CONSTRAINT "ServiceTransaction_walletTransactionId_fkey" FOREIGN KEY ("walletTransactionId") REFERENCES "WalletTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceTransaction" ADD CONSTRAINT "ServiceTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
