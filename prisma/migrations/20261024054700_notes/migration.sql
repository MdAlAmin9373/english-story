-- CreateEnum
CREATE TYPE "NoteKind" AS ENUM ('PRONUNCIATION', 'GRAMMAR');

-- CreateTable
CREATE TABLE "ChapterNote" (
    "id" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "kind" "NoteKind" NOT NULL,
    "titleBn" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "bodyBn" TEXT NOT NULL,
    "exampleEn" TEXT NOT NULL,

    CONSTRAINT "ChapterNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChapterNote_chapterId_order_key" ON "ChapterNote"("chapterId", "order");

-- AddForeignKey
ALTER TABLE "ChapterNote" ADD CONSTRAINT "ChapterNote_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
