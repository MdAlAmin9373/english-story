-- CreateEnum
CREATE TYPE "StoryCategory" AS ENUM ('DAILY_LIFE', 'MYSTERY_ADVENTURE', 'FUNNY', 'WORK_CAREER', 'TRAVEL', 'FABLES');

-- AlterTable
ALTER TABLE "Story" ADD COLUMN     "category" "StoryCategory" NOT NULL DEFAULT 'DAILY_LIFE';

-- CreateIndex
CREATE INDEX "Story_status_category_createdAt_idx" ON "Story"("status", "category", "createdAt");
