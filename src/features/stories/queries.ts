import "server-only";
import { db } from "@/lib/db";

// Database reads: call these inside a <Suspense> boundary.
// Only PUBLISHED stories and chapters are ever returned.

export async function getPublishedStories() {
  return db.story.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { createdAt: "desc" },
    select: {
      slug: true,
      titleBn: true,
      titleEn: true,
      summaryBn: true,
      genre: true,
      level: true,
      _count: { select: { chapters: { where: { status: "PUBLISHED" } } } },
    },
  });
}

export async function getStoryBySlug(slug: string) {
  return db.story.findFirst({
    where: { slug, status: "PUBLISHED" },
    select: {
      slug: true,
      titleBn: true,
      titleEn: true,
      summaryBn: true,
      summaryEn: true,
      genre: true,
      level: true,
      chapters: {
        where: { status: "PUBLISHED" },
        orderBy: { order: "asc" },
        select: { order: true, titleBn: true, titleEn: true, requiresLogin: true },
      },
    },
  });
}

export async function getChapter(slug: string, order: number) {
  const chapter = await db.chapter.findFirst({
    where: { order, status: "PUBLISHED", story: { slug, status: "PUBLISHED" } },
    select: {
      id: true,
      order: true,
      titleBn: true,
      titleEn: true,
      requiresLogin: true,
      story: { select: { slug: true, titleBn: true } },
      sentences: {
        orderBy: { order: "asc" },
        select: { order: true, bn: true, en: true },
      },
    },
  });
  if (!chapter) return null;

  // Neighbouring published chapters for prev/next links (orders may have gaps).
  const [prev, next] = await Promise.all([
    db.chapter.findFirst({
      where: { order: { lt: order }, status: "PUBLISHED", story: { slug } },
      orderBy: { order: "desc" },
      select: { order: true },
    }),
    db.chapter.findFirst({
      where: { order: { gt: order }, status: "PUBLISHED", story: { slug } },
      orderBy: { order: "asc" },
      select: { order: true },
    }),
  ]);

  return { ...chapter, prevOrder: prev?.order ?? null, nextOrder: next?.order ?? null };
}
