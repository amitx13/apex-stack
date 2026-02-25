-- AlterTable
ALTER TABLE "VendorWallet" ADD COLUMN     "processingBalance" DECIMAL(15,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "VendorWithdrawalRequest" ADD COLUMN     "settledAt" TIMESTAMP(3),
ADD COLUMN     "transactionRef" TEXT;
