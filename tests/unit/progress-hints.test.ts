// @vitest-environment node
import { describe, expect, test } from "vitest";
import {
  HINT_CAP,
  NO_HINTS,
  chapterScore,
  itemPoints,
  itemScore,
  solvedPoints,
  storyScore,
  summarizeAttempts,
} from "@/features/progress/progress";

const W = { correct: false };
const R = { correct: true };
const a = (itemId: string, correct: boolean) => ({ itemId, correct });
const hints = (questions: string[] = [], tasks: string[] = []) => ({
  questions: new Set(questions),
  tasks: new Set(tasks),
});

describe("itemScore: the one scoring rule", () => {
  // [first correct attempt, points without hint, points with hint]
  test.each([
    [1, 5, 1],
    [2, 2, 1],
    [3, 1, 1],
    [4, 1, 1],
    [7, 1, 1],
    [null, 0, 0],
  ])("first correct on attempt %s: %i without hint, %i with hint", (first, plain, hinted) => {
    expect(itemScore(first, false)).toBe(plain);
    expect(itemScore(first, true)).toBe(hinted);
  });

  test("the cap is 1", () => expect(HINT_CAP).toBe(1));
});

describe("itemPoints with a hint", () => {
  test("any correct answer gives 1", () => {
    expect(itemPoints([R], true)).toBe(1);
    expect(itemPoints([W, R], true)).toBe(1);
    expect(itemPoints([W, W, R], true)).toBe(1);
    expect(itemPoints([...Array(9).fill(W), R], true)).toBe(1);
  });
  test("never correct gives 0", () => {
    expect(itemPoints([W, W], true)).toBe(0);
    expect(itemPoints([], true)).toBe(0);
  });
  test("without the flag nothing changes", () => {
    expect(itemPoints([R])).toBe(5);
    expect(itemPoints([R], false)).toBe(5);
  });
});

const items = { questionIds: ["q1", "q2"], taskIds: ["t1"] };
const quiz = summarizeAttempts([a("q1", true), a("q2", false), a("q2", true)]);
const order = summarizeAttempts([a("t1", true)]);

describe("chapterScore with hint uses", () => {
  test("no hint uses: identical to the score without the argument", () => {
    const before = chapterScore(items, quiz, order);
    expect(before).toEqual({ points: 12, max: 15, firstTry: 2, items: 3 });
    expect(chapterScore(items, quiz, order, NO_HINTS)).toEqual(before);
    expect(chapterScore(items, quiz, order, hints())).toEqual(before);
  });

  test("a hinted first-try question gives 1 and is not a first-try solve", () => {
    expect(chapterScore(items, quiz, order, hints(["q1"]))).toEqual({
      points: 8, // 1 + 2 + 5
      max: 15,
      firstTry: 1,
      items: 3,
    });
  });

  test("question and task hints are kept apart", () => {
    // "t1" in the question set must not affect the task.
    expect(chapterScore(items, quiz, order, hints(["t1"])).points).toBe(12);
    expect(chapterScore(items, quiz, order, hints([], ["t1"])).points).toBe(8); // 5 + 2 + 1
  });

  test("a hint on an unsolved item still scores 0", () => {
    const unsolved = summarizeAttempts([a("q1", false)]);
    expect(chapterScore(items, unsolved, summarizeAttempts([]), hints(["q1", "q2"], ["t1"])).points).toBe(0);
  });

  test("hint uses for items outside the chapter change nothing", () => {
    expect(chapterScore(items, quiz, order, hints(["other"], ["other"]))).toEqual(
      chapterScore(items, quiz, order),
    );
  });

  test("story score adds the capped chapter scores", () => {
    const capped = chapterScore(items, quiz, order, hints(["q1", "q2"], ["t1"]));
    expect(capped.points).toBe(3);
    expect(storyScore([capped, chapterScore(items, quiz, order)]).points).toBe(15);
  });
});

describe("solvedPoints", () => {
  test("seeds the client with capped points for solved items only", () => {
    expect(solvedPoints(items.questionIds, quiz, new Set())).toEqual({ q1: 5, q2: 2 });
    expect(solvedPoints(items.questionIds, quiz, new Set(["q1"]))).toEqual({ q1: 1, q2: 2 });
    expect(solvedPoints(["q3"], quiz, new Set(["q3"]))).toEqual({});
  });
});
