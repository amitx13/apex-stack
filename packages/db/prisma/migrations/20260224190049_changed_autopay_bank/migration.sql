/*
  Warnings:

  - You are about to drop the column `upiOrBank` on the `AutoPay` table. All the data in the column will be lost.
  - Added the required column `accountNumber` to the `AutoPay` table without a default value. This is not possible if the table is not empty.
  - Added the required column `bankName` to the `AutoPay` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ifscCode` to the `AutoPay` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "AutoPay" DROP COLUMN "upiOrBank",
ADD COLUMN     "accountNumber" TEXT NOT NULL,
ADD COLUMN     "bankName" TEXT NOT NULL,
ADD COLUMN     "ifscCode" TEXT NOT NULL,
ADD COLUMN     "upiId" TEXT;
