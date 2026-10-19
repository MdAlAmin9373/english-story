// @vitest-environment node
import { describe, expect, test } from "vitest";
import { orderTaskSchema, tenseGridSchema } from "@/features/admin/schemas";
import {
  TENSE_FIELD_NAMES,
  checkOrderSentence,
  checkTenseGrid,
  countWords,
  normalizeCell,
  tenseFieldName,
} from "@/features/admin/validate";

describe("tenseFieldName", () => {
  test("joins time, kind and part", () => {
    expect(tenseFieldName("PAST", "PERFECT", "exampleEn")).toBe("PAST.PERFECT.exampleEn");
  });

  test("covers nine cells with two inputs each", () => {
    expect(TENSE_FIELD_NAMES).toHaveLength(18);
    expect(new Set(TENSE_FIELD_NAMES).size).toBe(18);
  });
});

describe("normalizeCell", () => {
  test("trims and collapses spaces", () => {
    expect(normalizeCell({ form: "  is   flying ", exampleEn: " She is flying. " })).toEqual({
      form: "is flying",
      exampleEn: "She is flying.",
    });
  });

  test("returns null when both inputs are empty", () => {
    expect(normalizeCell({ form: "  ", exampleEn: "" })).toBeNull();
    expect(normalizeCell({})).toBeNull();
  });

  test("keeps a half-filled cell so the grid can report it", () => {
    expect(normalizeCell({ form: "flies" })).toEqual({ form: "flies", exampleEn: "" });
  });
});

describe("checkTenseGrid", () => {
  test("an empty grid has no cells and no errors", () => {
    expect(checkTenseGrid({})).toEqual({ cells: [], errors: {} });
  });

  test("returns filled cells and skips empty ones", () => {
    const { cells, errors } = checkTenseGrid({
      "PRESENT.SIMPLE.form": "flies",
      "PRESENT.SIMPLE.exampleEn": "The bird flies.",
      "FUTURE.PERFECT.form": "will have flown",
      "FUTURE.PERFECT.exampleEn": "It will have flown away.",
      "PAST.SIMPLE.form": " ",
    });
    expect(errors).toEqual({});
    expect(cells).toEqual([
      { time: "PRESENT", kind: "SIMPLE", form: "flies", exampleEn: "The bird flies." },
      {
        time: "FUTURE",
        kind: "PERFECT",
        form: "will have flown",
        exampleEn: "It will have flown away.",
      },
    ]);
  });

  test("a full grid gives nine cells", () => {
    const raw = Object.fromEntries(TENSE_FIELD_NAMES.map((name) => [name, "x y"]));
    expect(checkTenseGrid(raw).cells).toHaveLength(9);
  });

  test("a half-filled cell is an error on the empty input", () => {
    const { cells, errors } = checkTenseGrid({ "PAST.CONTINUOUS.form": "was flying" });
    expect(cells).toEqual([]);
    expect(Object.keys(errors)).toEqual(["PAST.CONTINUOUS.exampleEn"]);
  });

  test("rejects too long inputs", () => {
    const { errors } = checkTenseGrid({
      "PRESENT.PERFECT.form": "a".repeat(61),
      "PRESENT.PERFECT.exampleEn": "b".repeat(301),
    });
    expect(Object.keys(errors).sort()).toEqual([
      "PRESENT.PERFECT.exampleEn",
      "PRESENT.PERFECT.form",
    ]);
  });
});

describe("countWords", () => {
  test("counts space-separated tokens", () => {
    expect(countWords("  Rina,  come here! ")).toBe(3);
    expect(countWords("")).toBe(0);
  });
});

describe("checkOrderSentence", () => {
  test("accepts 3 to 12 words", () => {
    expect(checkOrderSentence("Rina flies kites.")).toBeNull();
    expect(checkOrderSentence(Array(12).fill("go").join(" "))).toBeNull();
  });

  test("rejects too few or too many words", () => {
    expect(checkOrderSentence("Come here!")).not.toBeNull();
    expect(checkOrderSentence(Array(13).fill("go").join(" "))).not.toBeNull();
  });

  test("rejects punctuation-only tokens", () => {
    expect(checkOrderSentence("Rina — flies kites")).not.toBeNull();
    expect(checkOrderSentence("It's 5 o'clock.")).toBeNull();
  });
});

describe("tenseGridSchema", () => {
  test("outputs the filled cells", () => {
    const parsed = tenseGridSchema.safeParse({
      "PAST.SIMPLE.form": "flew",
      "PAST.SIMPLE.exampleEn": "The kite flew high.",
      "$ACTION_ID_abc": "",
    });
    expect(parsed.success && parsed.data).toEqual([
      { time: "PAST", kind: "SIMPLE", form: "flew", exampleEn: "The kite flew high." },
    ]);
  });

  test("puts cell errors under the field name", () => {
    const parsed = tenseGridSchema.safeParse({ "PAST.SIMPLE.exampleEn": "The kite flew." });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0].path).toEqual(["PAST.SIMPLE.form"]);
    }
  });
});

describe("orderTaskSchema", () => {
  test("accepts a hint and a sentence", () => {
    const parsed = orderTaskSchema.safeParse({
      promptBn: " রিনা ঘুড়ি ওড়ায়। ",
      en: "Rina flies a kite.",
    });
    expect(parsed.success && parsed.data.promptBn).toBe("রিনা ঘুড়ি ওড়ায়।");
  });

  test("requires the Bengali hint", () => {
    const parsed = orderTaskSchema.safeParse({ promptBn: "  ", en: "Rina flies a kite." });
    expect(parsed.success).toBe(false);
    if (!parsed.success) expect(parsed.error.issues[0].path).toEqual(["promptBn"]);
  });

  test("puts the word-count error on en", () => {
    const parsed = orderTaskSchema.safeParse({ promptBn: "এখানে এসো", en: "Come here!" });
    expect(parsed.success).toBe(false);
    if (!parsed.success) expect(parsed.error.issues[0].path).toEqual(["en"]);
  });
});
