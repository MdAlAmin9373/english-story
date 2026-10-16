-- CreateEnum
CREATE TYPE "TenseKind" AS ENUM ('SIMPLE', 'CONTINUOUS', 'PERFECT');

-- CreateEnum
CREATE TYPE "TenseTime" AS ENUM ('PRESENT', 'PAST', 'FUTURE');

-- CreateTable
CREATE TABLE "VocabularyWord" (
    "id" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "word" TEXT NOT NULL,
    "meaningBn" TEXT NOT NULL,
    "pronunciationBn" TEXT NOT NULL,
    "exampleEn" TEXT NOT NULL,
    "exampleBn" TEXT NOT NULL,

    CONSTRAINT "VocabularyWord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WordForm" (
    "id" TEXT NOT NULL,
    "word" TEXT NOT NULL,
    "kind" "TenseKind" NOT NULL,
    "time" "TenseTime" NOT NULL,
    "form" TEXT NOT NULL,
    "exampleEn" TEXT NOT NULL,

    CONSTRAINT "WordForm_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VocabularyWord_word_idx" ON "VocabularyWord"("word");

-- CreateIndex
CREATE UNIQUE INDEX "VocabularyWord_chapterId_word_key" ON "VocabularyWord"("chapterId", "word");

-- CreateIndex
CREATE UNIQUE INDEX "VocabularyWord_chapterId_order_key" ON "VocabularyWord"("chapterId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "WordForm_word_time_kind_key" ON "WordForm"("word", "time", "kind");

-- AddForeignKey
ALTER TABLE "VocabularyWord" ADD CONSTRAINT "VocabularyWord_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
