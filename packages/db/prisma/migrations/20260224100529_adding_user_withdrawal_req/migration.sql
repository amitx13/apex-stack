/*
  Warnings:

  - You are about to drop the column `amountTransferred` on the `WithdrawalRequest` table. All the data in the column will be lost.
  - Added the required column `amountToTransfer` to the `WithdrawalRequest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `serviceFee` to the `WithdrawalRequest` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "WithdrawalRequest" DROP COLUMN "amountTransferred",
ADD COLUMN     "amountToTransfer" DECIMAL(15,2) NOT NULL,
ADD COLUMN     "serviceFee" DECIMAL(15,2) NOT NULL;
