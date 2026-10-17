import "server-only";
import { db } from "@/lib/db";

// Admin reads: no status filter, so drafts are included.
// Call these only after requireAdmin(), inside a <Suspense> boundary.

export async function getAdminStories() {
  return db.story.findMany({
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      slug: true,
      titleBn: true,
      titleEn: true,
      genre: true,
      level: true,
      status: true,
      _count: { select: { chapters: true } },
    },
  });
}

export async function getAdminStory(id: string) {
  return db.story.findUnique({
    where: { id },
    select: {
      id: true,
      slug: true,
      titleBn: true,
      titleEn: true,
      summaryBn: true,
      summaryEn: true,
      genre: true,
      level: true,
      status: true,
      chapters: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          order: true,
          titleBn: true,
          titleEn: true,
          requiresLogin: true,
          status: true,
        },
      },
    },
  });
}

export async function getAdminStoryTitle(id: string) {
  return db.story.findUnique({
    where: { id },
    select: { id: true, titleBn: true },
  });
}

// Scoped to the story in the URL, so a mismatched pair is treated as not found.
export async function getAdminChapter(storyId: string, chapterId: string) {
  return db.chapter.findFirst({
    where: { id: chapterId, storyId },
    select: {
      id: true,
      order: true,
      titleBn: true,
      titleEn: true,
      requiresLogin: true,
      status: true,
      story: { select: { id: true, titleBn: true } },
    },
  });
}
