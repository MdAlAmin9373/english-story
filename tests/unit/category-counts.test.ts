// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from "vitest";

const { db, cacheTag, cacheLife } = vi.hoisted(() => ({
  db: { story: { groupBy: vi.fn(), findMany: vi.fn() } },
  cacheTag: vi.fn(),
  cacheLife: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ cacheTag, cacheLife }));
vi.mock("@/lib/db", () => ({ db }));

import { STORIES_TAG } from "@/features/stories/cache";
import {
  getPublishedCategoryCounts,
  getPublishedStories,
  getPublishedStoriesByCategory,
} from "@/features/stories/queries";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getPublishedCategoryCounts", () => {
  test("counts only PUBLISHED stories, grouped by category", async () => {
    db.story.groupBy.mockResolvedValue([
      { category: "TRAVEL", _count: { _all: 3 } },
      { category: "FUNNY", _count: { _all: 1 } },
    ]);

    const counts = await getPublishedCategoryCounts();

    expect(db.story.groupBy).toHaveBeenCalledTimes(1);
    expect(db.story.groupBy).toHaveBeenCalledWith({
      by: ["category"],
      where: { status: "PUBLISHED" },
      _count: { _all: true },
    });
    expect(counts).toEqual({
      DAILY_LIFE: 0,
      MYSTERY_ADVENTURE: 0,
      FUNNY: 1,
      WORK_CAREER: 0,
      TRAVEL: 3,
      FABLES: 0,
    });
  });

  test("an empty database gives 0 for every category", async () => {
    db.story.groupBy.mockResolvedValue([]);
    const counts = await getPublishedCategoryCounts();
    expect(Object.values(counts)).toEqual([0, 0, 0, 0, 0, 0]);
  });

  test("is tagged so admin actions can refresh it", async () => {
    db.story.groupBy.mockResolvedValue([]);
    await getPublishedCategoryCounts();
    expect(cacheTag).toHaveBeenCalledWith(STORIES_TAG);
  });
});

describe("published story lists", () => {
  test("a category page lists only PUBLISHED stories of that category", async () => {
    db.story.findMany.mockResolvedValue([]);
    await getPublishedStoriesByCategory("FABLES");
    expect(db.story.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: "PUBLISHED", category: "FABLES" },
        orderBy: { createdAt: "desc" },
      }),
    );
    expect(cacheTag).toHaveBeenCalledWith(STORIES_TAG);
  });

  test("/stories lists only PUBLISHED stories and is tagged", async () => {
    db.story.findMany.mockResolvedValue([]);
    await getPublishedStories();
    expect(db.story.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: "PUBLISHED" } }),
    );
    expect(cacheTag).toHaveBeenCalledWith(STORIES_TAG);
  });
});
