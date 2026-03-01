/*
  Warnings:

  - The values [APPROVED] on the enum `WithdrawalStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "WithdrawalStatus_new" AS ENUM ('PENDING', 'REJECTED', 'COMPLETED');
ALTER TABLE "public"."VendorWithdrawalRequest" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."WithdrawalRequest" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "WithdrawalRequest" ALTER COLUMN "status" TYPE "WithdrawalStatus_new" USING ("status"::text::"WithdrawalStatus_new");
ALTER TABLE "VendorWithdrawalRequest" ALTER COLUMN "status" TYPE "WithdrawalStatus_new" USING ("status"::text::"WithdrawalStatus_new");
ALTER TYPE "WithdrawalStatus" RENAME TO "WithdrawalStatus_old";
ALTER TYPE "WithdrawalStatus_new" RENAME TO "WithdrawalStatus";
DROP TYPE "public"."WithdrawalStatus_old";
ALTER TABLE "VendorWithdrawalRequest" ALTER COLUMN "status" SET DEFAULT 'PENDING';
ALTER TABLE "WithdrawalRequest" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;
