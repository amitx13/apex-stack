/*
  Warnings:

  - Added the required column `accountType` to the `vendor_bank_details` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('SAVINGS', 'CURRENT');

-- AlterTable
ALTER TABLE "vendor_bank_details" ADD COLUMN     "accountType" "AccountType" NOT NULL;
