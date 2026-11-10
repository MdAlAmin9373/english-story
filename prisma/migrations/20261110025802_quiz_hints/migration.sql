-- AlterTable
ALTER TABLE "QuizQuestion" ADD COLUMN     "hint" TEXT;

-- AlterTable
ALTER TABLE "SentenceOrderTask" ADD COLUMN     "hint" TEXT;

-- CreateTable
CREATE TABLE "QuizHintUse" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuizHintUse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderTaskHintUse" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderTaskHintUse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuizHintUse_questionId_idx" ON "QuizHintUse"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "QuizHintUse_userId_questionId_key" ON "QuizHintUse"("userId", "questionId");

-- CreateIndex
CREATE INDEX "OrderTaskHintUse_taskId_idx" ON "OrderTaskHintUse"("taskId");

-- CreateIndex
CREATE UNIQUE INDEX "OrderTaskHintUse_userId_taskId_key" ON "OrderTaskHintUse"("userId", "taskId");

-- AddForeignKey
ALTER TABLE "QuizHintUse" ADD CONSTRAINT "QuizHintUse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizHintUse" ADD CONSTRAINT "QuizHintUse_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "QuizQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderTaskHintUse" ADD CONSTRAINT "OrderTaskHintUse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderTaskHintUse" ADD CONSTRAINT "OrderTaskHintUse_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "SentenceOrderTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
