-- CreateEnum
CREATE TYPE "OperatorCode" AS ENUM ('RJ', 'AT', 'VI', 'BT', 'BS');

-- CreateEnum
CREATE TYPE "RechargeCategory" AS ENUM ('Recommended_packs', 'Unlimited_5g_plans', 'Top_data_packs', 'Monthly_packs');

-- CreateTable
CREATE TABLE "RechargePlan" (
    "id" TEXT NOT NULL,
    "operatorCode" "OperatorCode" NOT NULL,
    "category" "RechargeCategory" NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "data" TEXT NOT NULL,
    "calls" TEXT NOT NULL,
    "validity" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RechargePlan_pkey" PRIMARY KEY ("id")
);
