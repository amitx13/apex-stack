/*
  Warnings:

  - The `referenceType` column on the `WalletTransaction` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "ReferenceType" AS ENUM ('REGISTRATION', 'REENTRY', 'VENDOR_COMMISSION', 'USER_COMMISSION', 'VENDOR_PAYMENT', 'RECHARGE', 'RECHARGE_REFUND');

-- AlterTable
ALTER TABLE "WalletTransaction" DROP COLUMN "referenceType",
ADD COLUMN     "referenceType" "ReferenceType" NOT NULL DEFAULT 'REGISTRATION';
