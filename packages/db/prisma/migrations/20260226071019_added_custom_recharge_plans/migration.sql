/*
  Warnings:

  - The values [Recommended_packs] on the enum `RechargeCategory` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "RechargeCategory_new" AS ENUM ('Unlimited_5g_plans', 'Top_data_packs', 'Monthly_packs');
ALTER TABLE "RechargePlan" ALTER COLUMN "category" TYPE "RechargeCategory_new" USING ("category"::text::"RechargeCategory_new");
ALTER TYPE "RechargeCategory" RENAME TO "RechargeCategory_old";
ALTER TYPE "RechargeCategory_new" RENAME TO "RechargeCategory";
DROP TYPE "public"."RechargeCategory_old";
COMMIT;
