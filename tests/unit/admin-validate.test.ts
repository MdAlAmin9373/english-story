// @vitest-environment node
import { describe, expect, test } from "vitest";
import {
  chapterSchema,
  questionSchema,
  storySchema,
  wordSchema,
} from "@/features/admin/schemas";
import {
  checkQuestion,
  countGaps,
  nextOrder,
  normalizeSlug,
  normalizeWord,
  parseOptionLines,
  swapTarget,
} from "@/features/admin/validate";

describe("normalizeSlug", () => {
  test("lowercases and joins words with hyphens", () => {
    expect(normalizeSlug("  The Blue_Kite ")).toBe("the-blue-kite");
  });

  test("drops other characters and extra hyphens", () => {
    expect(normalizeSlug("--Rina's  kite!!--")).toBe("rinas-kite");
    expect(normalizeSlug("নীল ঘুড়ি")).toBe("");
  });
});

describe("normalizeWord", () => {
  test("stores a trimmed lowercase base form", () => {
    expect(normalizeWord("  Fly ")).toBe("fly");
    expect(normalizeWord("Look   After")).toBe("look after");
  });
});

describe("parseOptionLines", () => {
  test("one option per line, blank lines ignored", () => {
    expect(parseOptionLines(" fly \r\n\nflies\n  \nflew")).toEqual(["fly", "flies", "flew"]);
  });
});

describe("countGaps", () => {
  test("counts ___ markers", () => {
    expect(countGaps("He ___ a kite.")).toBe(1);
    expect(countGaps("He makes a kite.")).toBe(0);
    expect(countGaps("___ and ___")).toBe(2);
  });
});

describe("checkQuestion", () => {
  const base = {
    type: "MULTIPLE_CHOICE" as const,
    promptEn: "What does Rina make?",
    options: ["a kite", "a boat", "a cake"],
    correctIndex: 0,
  };

  test("accepts a valid question", () => {
    expect(checkQuestion(base)).toBeNull();
  });

  test("needs 2 to 6 options", () => {
    expect(checkQuestion({ ...base, options: ["a kite"], correctIndex: 0 })).not.toBeNull();
    expect(checkQuestion({ ...base, options: ["a", "b", "c", "d", "e", "f", "g"] })).not.toBeNull();
  });

  test("rejects duplicate options, ignoring case", () => {
    expect(checkQuestion({ ...base, options: ["a kite", "A Kite"] })).not.toBeNull();
  });

  test("rejects a correct answer outside the options", () => {
    expect(checkQuestion({ ...base, correctIndex: 3 })).not.toBeNull();
    expect(checkQuestion({ ...base, correctIndex: -1 })).not.toBeNull();
    expect(checkQuestion({ ...base, correctIndex: 0.5 })).not.toBeNull();
  });

  test("fill-gap needs exactly one ___", () => {
    const gap = { ...base, type: "FILL_GAP" as const, options: ["makes", "make"] };
    expect(checkQuestion({ ...gap, promptEn: "Rina ___ a kite." })).toBeNull();
    expect(checkQuestion({ ...gap, promptEn: "Rina makes a kite." })).not.toBeNull();
    expect(checkQuestion({ ...gap, promptEn: "___ ___ a kite." })).not.toBeNull();
  });
});

describe("nextOrder", () => {
  test("starts at 1 and appends after the highest order", () => {
    expect(nextOrder([])).toBe(1);
    expect(nextOrder([1, 2, 5])).toBe(6);
  });
});

describe("swapTarget", () => {
  const orders = [3, 1, 7];

  test("finds the neighbour in sorted order", () => {
    expect(swapTarget(orders, 3, "up")).toBe(1);
    expect(swapTarget(orders, 3, "down")).toBe(7);
  });

  test("returns null at the ends or for an unknown order", () => {
    expect(swapTarget(orders, 1, "up")).toBeNull();
    expect(swapTarget(orders, 7, "down")).toBeNull();
    expect(swapTarget(orders, 4, "up")).toBeNull();
  });
});

describe("storySchema", () => {
  const story = {
    slug: " The Blue Kite ",
    titleBn: "নীল ঘুড়ি",
    titleEn: "The Blue Kite",
    summaryBn: "একটি ঘুড়ির গল্প।",
    summaryEn: "A story about a kite.",
    genre: "FRIENDSHIP",
    level: "2",
    status: "DRAFT",
  };

  test("accepts form values and normalizes them", () => {
    const parsed = storySchema.parse(story);
    expect(parsed.slug).toBe("the-blue-kite");
    expect(parsed.level).toBe(2);
  });

  test("rejects an empty slug, bad level, unknown genre or blank title", () => {
    expect(storySchema.safeParse({ ...story, slug: "নীল" }).success).toBe(false);
    expect(storySchema.safeParse({ ...story, level: "6" }).success).toBe(false);
    expect(storySchema.safeParse({ ...story, genre: "HORROR" }).success).toBe(false);
    expect(storySchema.safeParse({ ...story, titleBn: "   " }).success).toBe(false);
  });
});

describe("chapterSchema", () => {
  const chapter = { titleBn: "শুরু", titleEn: "The Start", status: "PUBLISHED" };

  test("reads the requiresLogin checkbox", () => {
    expect(chapterSchema.parse({ ...chapter, requiresLogin: "on" }).requiresLogin).toBe(true);
    expect(chapterSchema.parse(chapter).requiresLogin).toBe(false);
  });

  test("rejects an unknown status", () => {
    expect(chapterSchema.safeParse({ ...chapter, status: "ARCHIVED" }).success).toBe(false);
  });
});

describe("wordSchema", () => {
  test("normalizes the word", () => {
    const parsed = wordSchema.parse({
      word: " Fly ",
      meaningBn: "ওড়া",
      pronunciationBn: "ফ্লাই",
      exampleEn: "Birds fly.",
      exampleBn: "পাখিরা ওড়ে।",
    });
    expect(parsed.word).toBe("fly");
  });
});

describe("questionSchema", () => {
  const question = {
    type: "FILL_GAP",
    promptBn: "শূন্যস্থান পূরণ করো।",
    promptEn: "Rina ___ a kite.",
    options: "makes\nmake\nmaking",
    correctIndex: "0",
  };

  test("parses options and the correct index from form values", () => {
    const parsed = questionSchema.parse(question);
    expect(parsed.options).toEqual(["makes", "make", "making"]);
    expect(parsed.correctIndex).toBe(0);
  });

  test("rejects an invalid question with a Bengali message", () => {
    const result = questionSchema.safeParse({ ...question, correctIndex: "5" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toMatch(/সঠিক উত্তর/);
  });
});
