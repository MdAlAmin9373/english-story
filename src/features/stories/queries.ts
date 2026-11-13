import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { Prisma, StoryCategory } from "@prisma/client";
import { db } from "@/lib/db";
import { STORIES_TAG } from "./cache";
import { buildCategoryCounts, type CategoryCounts } from "./categories";

// Database reads: call these inside a <Suspense> boundary.
// Only PUBLISHED stories and chapters are ever returned.

// Public lists are cached and tagged; admin actions call updateTag(STORIES_TAG) after
// every change, so a list is never stale after an edit. They read no cookies.

const storyCardSelect = {
  slug: true,
  titleBn: true,
  titleEn: true,
  summaryBn: true,
  genre: true,
  level: true,
  _count: { select: { chapters: { where: { status: "PUBLISHED" } } } },
} satisfies Prisma.StorySelect;

export async function getPublishedStories() {
  "use cache";
  cacheTag(STORIES_TAG);
  cacheLife("hours");
  return db.story.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { createdAt: "desc" },
    select: storyCardSelect,
  });
}

export async function getPublishedStoriesByCategory(category: StoryCategory) {
  "use cache";
  cacheTag(STORIES_TAG);
  cacheLife("hours");
  return db.story.findMany({
    where: { status: "PUBLISHED", category },
    orderBy: { createdAt: "desc" },
    select: storyCardSelect,
  });
}

// Published stories per category; categories with none are 0.
export async function getPublishedCategoryCounts(): Promise<CategoryCounts> {
  "use cache";
  cacheTag(STORIES_TAG);
  cacheLife("hours");
  const rows = await db.story.groupBy({
    by: ["category"],
    where: { status: "PUBLISHED" },
    _count: { _all: true },
  });
  return buildCategoryCounts(rows.map((r) => ({ category: r.category, count: r._count._all })));
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
      story: { select: { id: true, slug: true, titleBn: true } },
      sentences: {
        orderBy: { order: "asc" },
        select: { order: true, bn: true, en: true },
      },
    },
  });
  if (!chapter) return null;

  // All published orders, for prev/next links (orders may have gaps), position and the lock.
  const rows = await db.chapter.findMany({
    where: { storyId: chapter.story.id, status: "PUBLISHED" },
    orderBy: { order: "asc" },
    select: { order: true },
  });
  const publishedOrders = rows.map((r) => r.order);
  const index = publishedOrders.indexOf(order);

  return {
    ...chapter,
    prevOrder: publishedOrders[index - 1] ?? null,
    nextOrder: publishedOrders[index + 1] ?? null,
    position: index + 1,
    total: publishedOrders.length,
    publishedOrders,
  };
}
