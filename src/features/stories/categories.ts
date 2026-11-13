// Story categories: the single source of truth for slugs, names, icons and colors.
// No server imports, so client forms, the home page and tests can all use it.
// Colors are CSS variables defined per theme in app/globals.css (no raw colors in src).

import type { StoryCategory } from "@prisma/client";
import { toBnDigits } from "./labels";

export type CategoryMeta = {
  value: StoryCategory;
  slug: string; // kebab-case, used in /stories/category/[slug]
  nameBn: string;
  nameEn: string;
  icon: string; // decorative emoji
  cover: string; // CSS color for the cover face
  spine: string; // CSS color for the spine
  ink: string; // text color on cover and spine
};

function colors(slug: string) {
  return {
    cover: `var(--cat-${slug}-cover)`,
    spine: `var(--cat-${slug}-spine)`,
    ink: `var(--cat-${slug}-ink)`,
  };
}

// Display order on the home page shelf.
export const CATEGORIES = [
  {
    value: "DAILY_LIFE",
    slug: "daily-life",
    nameBn: "দৈনন্দিন জীবন",
    nameEn: "Daily Life",
    icon: "🏠",
    ...colors("daily-life"),
  },
  {
    value: "MYSTERY_ADVENTURE",
    slug: "mystery-adventure",
    nameBn: "রহস্য ও রোমাঞ্চ",
    nameEn: "Mystery & Adventure",
    icon: "🔍",
    ...colors("mystery-adventure"),
  },
  {
    value: "FUNNY",
    slug: "funny",
    nameBn: "হাসির গল্প",
    nameEn: "Funny Stories",
    icon: "😄",
    ...colors("funny"),
  },
  {
    value: "WORK_CAREER",
    slug: "work-career",
    nameBn: "চাকরি ও কাজ",
    nameEn: "Work & Career",
    icon: "💼",
    ...colors("work-career"),
  },
  {
    value: "TRAVEL",
    slug: "travel",
    nameBn: "ভ্রমণ",
    nameEn: "Travel",
    icon: "✈️",
    ...colors("travel"),
  },
  {
    value: "FABLES",
    slug: "fables",
    nameBn: "উপকথা ও নীতিকথা",
    nameEn: "Fables",
    icon: "🦊",
    ...colors("fables"),
  },
] as const satisfies readonly CategoryMeta[];

// Enum values for validation (z.enum) and the admin <select>.
export const CATEGORY_VALUES = CATEGORIES.map((c) => c.value) as [
  StoryCategory,
  ...StoryCategory[],
];

export const DEFAULT_CATEGORY: StoryCategory = "DAILY_LIFE";

// Exact match only; unknown slugs return null (the page calls notFound()).
export function categoryBySlug(slug: string): CategoryMeta | null {
  return CATEGORIES.find((c) => c.slug === slug) ?? null;
}

export function categoryByValue(value: StoryCategory): CategoryMeta {
  const meta = CATEGORIES.find((c) => c.value === value);
  if (!meta) throw new Error(`Unknown story category: ${value}`);
  return meta;
}

export function categoryHref(category: Pick<CategoryMeta, "slug">): string {
  return `/stories/category/${category.slug}`;
}

export type CategoryCounts = Record<StoryCategory, number>;

// Turns grouped rows into a count for every category (missing ones are 0).
export function buildCategoryCounts(
  rows: readonly { category: StoryCategory; count: number }[],
): CategoryCounts {
  const counts = Object.fromEntries(CATEGORY_VALUES.map((v) => [v, 0])) as CategoryCounts;
  for (const row of rows) {
    if (row.category in counts) counts[row.category] += row.count;
  }
  return counts;
}

export function storyCountLabel(count: number): string {
  return count > 0 ? `${toBnDigits(count)}টি গল্প` : "শীঘ্রই আসছে";
}
