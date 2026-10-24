import "server-only";
import { db } from "@/lib/db";

// Database reads: call these inside a <Suspense> boundary.
// Callers must check chapter access (features/stories/access.ts) first.

export async function getChapterNotes(chapterId: string) {
  return db.chapterNote.findMany({
    where: { chapterId },
    orderBy: { order: "asc" },
    select: {
      order: true,
      kind: true,
      titleBn: true,
      titleEn: true,
      bodyBn: true,
      exampleEn: true,
    },
  });
}
