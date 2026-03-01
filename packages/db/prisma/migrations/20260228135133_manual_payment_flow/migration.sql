/*
  Warnings:

  - You are about to drop the column `paytmResponse` on the `Payment` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Payment" DROP COLUMN "paytmResponse",
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "screenshot" TEXT;
