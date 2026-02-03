-- CreateEnum
CREATE TYPE "ReentryStatus" AS ENUM ('PENDING', 'PROCESSED');

-- CreateTable
CREATE TABLE "ReentryQueue" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "ReentryStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReentryQueue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReentryQueue_status_idx" ON "ReentryQueue"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ReentryQueue_userId_status_key" ON "ReentryQueue"("userId", "status");

-- AddForeignKey
ALTER TABLE "ReentryQueue" ADD CONSTRAINT "ReentryQueue_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
