/*
  Warnings:

  - The values [APPROVED] on the enum `AutoPayStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "AutoPayStatus_new" AS ENUM ('PENDING_APPROVAL', 'ACTIVE', 'PAUSED', 'CANCELLED', 'REJECTED');
ALTER TABLE "public"."AutoPay" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "AutoPay" ALTER COLUMN "status" TYPE "AutoPayStatus_new" USING ("status"::text::"AutoPayStatus_new");
ALTER TYPE "AutoPayStatus" RENAME TO "AutoPayStatus_old";
ALTER TYPE "AutoPayStatus_new" RENAME TO "AutoPayStatus";
DROP TYPE "public"."AutoPayStatus_old";
ALTER TABLE "AutoPay" ALTER COLUMN "status" SET DEFAULT 'PENDING_APPROVAL';
COMMIT;
