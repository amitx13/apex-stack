/*
  Warnings:

  - You are about to drop the column `paidBy` on the `VendorTransaction` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "VendorTransaction" DROP COLUMN "paidBy",
ALTER COLUMN "commissionAmount" SET DEFAULT 0;
