-- AlterTable
ALTER TABLE "ServiceTransaction" ADD COLUMN     "billDate" TIMESTAMP(3),
ADD COLUMN     "billFetchId" TEXT,
ADD COLUMN     "billedAmount" DECIMAL(10,2),
ADD COLUMN     "customerName" TEXT,
ADD COLUMN     "dueDate" TIMESTAMP(3),
ADD COLUMN     "partPayment" BOOLEAN;
