-- CreateEnum
CREATE TYPE "AutoPayStatus" AS ENUM ('PENDING_APPROVAL', 'APPROVED', 'ACTIVE', 'PAUSED', 'CANCELLED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AutoPayDueDate" AS ENUM ('FIVE', 'TEN', 'FIFTEEN');

-- CreateEnum
CREATE TYPE "AutoPayCategory" AS ENUM ('RENT', 'SCHOOL', 'COLLEGE', 'EMI', 'TUITION');

-- CreateEnum
CREATE TYPE "AutoPayExecutionStatus" AS ENUM ('SUCCESS', 'INSUFFICIENT', 'FAILED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ReferenceType" ADD VALUE 'AUTOPAY';
ALTER TYPE "ReferenceType" ADD VALUE 'AUTOPAY_REFUND';

-- AlterTable
ALTER TABLE "BillRequest" ALTER COLUMN "billImageUrl" DROP NOT NULL;

-- CreateTable
CREATE TABLE "AutoPay" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "beneficiaryName" TEXT NOT NULL,
    "upiOrBank" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "dueDate" "AutoPayDueDate" NOT NULL,
    "category" "AutoPayCategory" NOT NULL,
    "status" "AutoPayStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutoPay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutoPayExecution" (
    "id" TEXT NOT NULL,
    "autoPayId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "charge" DECIMAL(15,2) NOT NULL,
    "totalDebit" DECIMAL(15,2) NOT NULL,
    "status" "AutoPayExecutionStatus" NOT NULL,
    "walletTransactionId" TEXT,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AutoPayExecution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AutoPay_userId_idx" ON "AutoPay"("userId");

-- CreateIndex
CREATE INDEX "AutoPay_status_idx" ON "AutoPay"("status");

-- CreateIndex
CREATE INDEX "AutoPay_dueDate_idx" ON "AutoPay"("dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "AutoPayExecution_walletTransactionId_key" ON "AutoPayExecution"("walletTransactionId");

-- CreateIndex
CREATE INDEX "AutoPayExecution_autoPayId_idx" ON "AutoPayExecution"("autoPayId");

-- CreateIndex
CREATE INDEX "AutoPayExecution_userId_idx" ON "AutoPayExecution"("userId");

-- CreateIndex
CREATE INDEX "AutoPayExecution_status_idx" ON "AutoPayExecution"("status");

-- CreateIndex
CREATE INDEX "AutoPayExecution_executedAt_idx" ON "AutoPayExecution"("executedAt");

-- AddForeignKey
ALTER TABLE "AutoPay" ADD CONSTRAINT "AutoPay_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutoPayExecution" ADD CONSTRAINT "AutoPayExecution_autoPayId_fkey" FOREIGN KEY ("autoPayId") REFERENCES "AutoPay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutoPayExecution" ADD CONSTRAINT "AutoPayExecution_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutoPayExecution" ADD CONSTRAINT "AutoPayExecution_walletTransactionId_fkey" FOREIGN KEY ("walletTransactionId") REFERENCES "WalletTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
