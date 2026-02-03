-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isGasConsumerVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isRegistrationPayment" BOOLEAN NOT NULL DEFAULT false;
