// @vitest-environment node
import { describe, expect, test } from "vitest";
import {
  isCorrectChoice,
  isCorrectOrder,
  parseOptions,
  seededShuffle,
  tokenize,
} from "@/features/quiz/check";

describe("parseOptions", () => {
  test("accepts a non-empty string array", () => {
    expect(parseOptions(["fly", "flies"])).toEqual(["fly", "flies"]);
  });

  test("rejects anything else", () => {
    expect(parseOptions([])).toBeNull();
    expect(parseOptions(["fly", 2])).toBeNull();
    expect(parseOptions("fly")).toBeNull();
    expect(parseOptions(null)).toBeNull();
    expect(parseOptions({ 0: "fly" })).toBeNull();
  });
});

describe("isCorrectChoice", () => {
  test("correct when the chosen index matches", () => {
    expect(isCorrectChoice(1, 1, 4)).toBe(true);
  });

  test("wrong when the chosen index differs", () => {
    expect(isCorrectChoice(1, 0, 4)).toBe(false);
    expect(isCorrectChoice(1, 3, 4)).toBe(false);
  });

  test("rejects out-of-range indexes even if they match", () => {
    expect(isCorrectChoice(4, 4, 4)).toBe(false);
    expect(isCorrectChoice(-1, -1, 4)).toBe(false);
  });

  test("rejects non-integer indexes", () => {
    expect(isCorrectChoice(1, 1.5, 4)).toBe(false);
    expect(isCorrectChoice(1, Number.NaN, 4)).toBe(false);
  });
});

describe("tokenize", () => {
  test("splits on any whitespace and keeps punctuation on words", () => {
    expect(tokenize("  One morning,  he makes\ta kite. ")).toEqual([
      "One",
      "morning,",
      "he",
      "makes",
      "a",
      "kite.",
    ]);
  });
});

describe("isCorrectOrder", () => {
  const sentence = "One morning, he makes a kite.";

  test("accepts the exact order", () => {
    expect(isCorrectOrder(sentence, tokenize(sentence))).toBe(true);
  });

  test("ignores case and punctuation", () => {
    expect(isCorrectOrder(sentence, ["one", "Morning", "he", "makes", "a", "kite"])).toBe(true);
  });

  test("rejects a wrong order", () => {
    expect(isCorrectOrder(sentence, ["morning,", "One", "he", "makes", "a", "kite."])).toBe(false);
  });

  test("rejects missing or extra words", () => {
    expect(isCorrectOrder(sentence, ["One", "morning,", "he", "makes", "kite."])).toBe(false);
    expect(
      isCorrectOrder(sentence, ["One", "morning,", "he", "makes", "a", "kite.", "kite."]),
    ).toBe(false);
  });

  test("handles repeated words", () => {
    expect(isCorrectOrder("the cat and the dog", ["the", "cat", "and", "the", "dog"])).toBe(true);
    expect(isCorrectOrder("the cat and the dog", ["the", "dog", "and", "the", "cat"])).toBe(false);
  });
});

describe("seededShuffle", () => {
  const words = tokenize("There is a river next to his house.");

  test("keeps every item exactly once", () => {
    const shuffled = seededShuffle(words, "task-1");
    expect([...shuffled].sort()).toEqual([...words].sort());
  });

  test("is stable for the same seed", () => {
    expect(seededShuffle(words, "task-1")).toEqual(seededShuffle(words, "task-1"));
  });

  test("never returns the original order", () => {
    for (let i = 0; i < 200; i++) {
      expect(seededShuffle(["a", "b"], `seed-${i}`)).not.toEqual(["a", "b"]);
      expect(seededShuffle(words, `seed-${i}`)).not.toEqual(words);
    }
  });

  test("does not change the input", () => {
    const input = ["a", "b", "c"];
    seededShuffle(input, "x");
    expect(input).toEqual(["a", "b", "c"]);
  });
});
