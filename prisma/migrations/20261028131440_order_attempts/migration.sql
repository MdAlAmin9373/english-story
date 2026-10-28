-- CreateTable
CREATE TABLE "OrderTaskAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "correct" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderTaskAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrderTaskAttempt_userId_taskId_createdAt_idx" ON "OrderTaskAttempt"("userId", "taskId", "createdAt");

-- CreateIndex
CREATE INDEX "OrderTaskAttempt_taskId_idx" ON "OrderTaskAttempt"("taskId");

-- AddForeignKey
ALTER TABLE "OrderTaskAttempt" ADD CONSTRAINT "OrderTaskAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderTaskAttempt" ADD CONSTRAINT "OrderTaskAttempt_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "SentenceOrderTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
