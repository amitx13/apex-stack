-- CreateEnum
CREATE TYPE "BillRequestStatus" AS ENUM ('PENDING', 'COMPLETED', 'REJECTED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ReferenceType" ADD VALUE 'BILL_REQUEST';
ALTER TYPE "ReferenceType" ADD VALUE 'BILL_REFUND';

-- CreateTable
CREATE TABLE "BillRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "charge" DECIMAL(15,2) NOT NULL,
    "totalDebit" DECIMAL(15,2) NOT NULL,
    "billImageUrl" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "status" "BillRequestStatus" NOT NULL DEFAULT 'PENDING',
    "walletTransactionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BillRequest_walletTransactionId_key" ON "BillRequest"("walletTransactionId");

-- CreateIndex
CREATE INDEX "BillRequest_userId_idx" ON "BillRequest"("userId");

-- CreateIndex
CREATE INDEX "BillRequest_status_idx" ON "BillRequest"("status");

-- AddForeignKey
ALTER TABLE "BillRequest" ADD CONSTRAINT "BillRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillRequest" ADD CONSTRAINT "BillRequest_walletTransactionId_fkey" FOREIGN KEY ("walletTransactionId") REFERENCES "WalletTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
