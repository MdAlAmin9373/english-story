// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { StoryCategory } from "@prisma/client";
import { describe, expect, test } from "vitest";
import {
  CATEGORIES,
  CATEGORY_VALUES,
  buildCategoryCounts,
  categoryBySlug,
  categoryByValue,
  categoryHref,
  storyCountLabel,
} from "@/features/stories/categories";
import { THEMES } from "@/features/theme/theme";

describe("category metadata", () => {
  test("has exactly six categories", () => {
    expect(CATEGORIES).toHaveLength(6);
  });

  test("covers every StoryCategory enum value exactly once", () => {
    expect([...CATEGORY_VALUES].sort()).toEqual(Object.values(StoryCategory).sort());
    expect(new Set(CATEGORY_VALUES).size).toBe(CATEGORY_VALUES.length);
  });

  test("slugs are unique and kebab-case", () => {
    const slugs = CATEGORIES.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  });

  test("has the agreed Bengali and English names", () => {
    expect(CATEGORIES.map((c) => [c.value, c.nameBn, c.nameEn])).toEqual([
      ["DAILY_LIFE", "দৈনন্দিন জীবন", "Daily Life"],
      ["MYSTERY_ADVENTURE", "রহস্য ও রোমাঞ্চ", "Mystery & Adventure"],
      ["FUNNY", "হাসির গল্প", "Funny Stories"],
      ["WORK_CAREER", "চাকরি ও কাজ", "Work & Career"],
      ["TRAVEL", "ভ্রমণ", "Travel"],
      ["FABLES", "উপকথা ও নীতিকথা", "Fables"],
    ]);
  });

  test("every category has an icon and colors given as CSS variables", () => {
    for (const c of CATEGORIES) {
      expect(c.icon.length).toBeGreaterThan(0);
      expect(c.cover).toBe(`var(--cat-${c.slug}-cover)`);
      expect(c.spine).toBe(`var(--cat-${c.slug}-spine)`);
      expect(c.ink).toBe(`var(--cat-${c.slug}-ink)`);
    }
  });
});

describe("slug and value lookup", () => {
  test("finds each category by its slug and value", () => {
    for (const c of CATEGORIES) {
      expect(categoryBySlug(c.slug)).toBe(c);
      expect(categoryByValue(c.value)).toBe(c);
    }
  });

  test("unknown or near-miss slugs return null", () => {
    for (const slug of ["", "horror", "Travel", "DAILY_LIFE", "daily_life", " travel", "travel/"]) {
      expect(categoryBySlug(slug)).toBeNull();
    }
  });

  test("links to the category page", () => {
    expect(categoryHref({ slug: "fables" })).toBe("/stories/category/fables");
  });
});

describe("buildCategoryCounts", () => {
  test("fills missing categories with 0", () => {
    const counts = buildCategoryCounts([
      { category: "TRAVEL", count: 2 },
      { category: "FABLES", count: 1 },
    ]);
    expect(counts).toEqual({
      DAILY_LIFE: 0,
      MYSTERY_ADVENTURE: 0,
      FUNNY: 0,
      WORK_CAREER: 0,
      TRAVEL: 2,
      FABLES: 1,
    });
  });
});

test("story count label: Bengali digits, or 'coming soon' for none", () => {
  expect(storyCountLabel(0)).toBe("শীঘ্রই আসছে");
  expect(storyCountLabel(1)).toBe("১টি গল্প");
  expect(storyCountLabel(12)).toBe("১২টি গল্প");
});

// Every theme defines the tokens, and the text color is readable on cover and spine.
describe("category colors in globals.css", () => {
  const css = readFileSync(join(__dirname, "..", "..", "src", "app", "globals.css"), "utf8");

  function block(theme: string): string {
    const match = css.match(new RegExp(`\\[data-theme="${theme}"\\]\\s*\\{([^}]*)\\}`));
    if (!match) throw new Error(`no block for ${theme}`);
    return match[1];
  }

  function hex(body: string, name: string): string {
    const match = body.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6});`));
    if (!match) throw new Error(`${name} missing or not a 6-digit hex`);
    return match[1];
  }

  // WCAG 2 relative luminance and contrast ratio.
  function luminance(color: string): number {
    const [r, g, b] = [1, 3, 5].map((i) => {
      const c = parseInt(color.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
  function contrast(a: string, b: string): number {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  }

  test.each(THEMES.flatMap((theme) => CATEGORIES.map((c) => [theme, c.slug] as const)))(
    "%s / %s: ink has at least 4.5:1 contrast on cover and spine",
    (theme, slug) => {
      const body = block(theme);
      const ink = hex(body, `--cat-${slug}-ink`);
      expect(contrast(ink, hex(body, `--cat-${slug}-cover`))).toBeGreaterThanOrEqual(4.5);
      expect(contrast(ink, hex(body, `--cat-${slug}-spine`))).toBeGreaterThanOrEqual(4.5);
    },
  );
});
