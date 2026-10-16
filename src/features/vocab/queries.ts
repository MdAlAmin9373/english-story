import "server-only";
import { db } from "@/lib/db";

// Database reads: call these inside a <Suspense> boundary.
// Callers must check chapter access (features/stories/access.ts) first.

export async function getChapterWords(chapterId: string) {
  return db.vocabularyWord.findMany({
    where: { chapterId },
    orderBy: { order: "asc" },
    select: {
      order: true,
      word: true,
      meaningBn: true,
      pronunciationBn: true,
      exampleEn: true,
      exampleBn: true,
    },
  });
}

export async function getWordForms(word: string) {
  return db.wordForm.findMany({
    where: { word },
    select: { kind: true, time: true, form: true, exampleEn: true },
  });
}

// Tense forms for several words in one query (avoids one query per word).
export async function getWordFormsFor(words: string[]) {
  if (words.length === 0) return [];
  return db.wordForm.findMany({
    where: { word: { in: words } },
    select: { word: true, kind: true, time: true, form: true, exampleEn: true },
  });
}
