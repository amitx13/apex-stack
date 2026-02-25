/*
  Warnings:

  - Made the column `referenceId` on table `WalletTransaction` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "WalletTransaction" ALTER COLUMN "referenceId" SET NOT NULL;
