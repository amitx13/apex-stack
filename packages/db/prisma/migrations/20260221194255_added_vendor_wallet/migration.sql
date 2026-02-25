/*
  Warnings:

  - Added the required column `paidBy` to the `VendorTransaction` table without a default value. This is not possible if the table is not empty.
  - Made the column `commissionAmount` on table `VendorTransaction` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "CommissionPaidBy" AS ENUM ('VENDOR', 'USER');

-- AlterTable
ALTER TABLE "Vendor" ADD COLUMN     "paymentQr" TEXT;

-- AlterTable
ALTER TABLE "VendorTransaction" ADD COLUMN     "paidBy" "CommissionPaidBy" NOT NULL,
ADD COLUMN     "vendorWalletId" TEXT,
ALTER COLUMN "commissionAmount" SET NOT NULL;

-- CreateTable
CREATE TABLE "VendorWallet" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "balance" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorWallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorWithdrawalRequest" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "pointsRequested" DECIMAL(15,2) NOT NULL,
    "status" "WithdrawalStatus" NOT NULL DEFAULT 'PENDING',
    "amountTransferred" DECIMAL(15,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorWithdrawalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VendorWallet_vendorId_key" ON "VendorWallet"("vendorId");

-- CreateIndex
CREATE INDEX "VendorWithdrawalRequest_vendorId_idx" ON "VendorWithdrawalRequest"("vendorId");

-- CreateIndex
CREATE INDEX "VendorWithdrawalRequest_status_idx" ON "VendorWithdrawalRequest"("status");

-- AddForeignKey
ALTER TABLE "VendorWallet" ADD CONSTRAINT "VendorWallet_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorTransaction" ADD CONSTRAINT "VendorTransaction_vendorWalletId_fkey" FOREIGN KEY ("vendorWalletId") REFERENCES "VendorWallet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorTransaction" ADD CONSTRAINT "VendorTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorWithdrawalRequest" ADD CONSTRAINT "VendorWithdrawalRequest_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
