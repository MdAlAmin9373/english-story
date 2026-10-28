// @vitest-environment node
import { describe, expect, test } from "vitest";
import { attemptLabel, remainingLabel, scoreLabel } from "@/features/progress/labels";
import {
  chapterLock,
  chapterRequirements,
  chapterScore,
  itemPoints,
  pickResume,
  storyProgress,
  storyScore,
  summarizeAttempts,
} from "@/features/progress/progress";

const W = { correct: false };
const R = { correct: true };
const a = (itemId: string, correct: boolean) => ({ itemId, correct });

describe("itemPoints", () => {
  test("first attempt correct: 5", () => expect(itemPoints([R])).toBe(5));
  test("second attempt correct: 2", () => expect(itemPoints([W, R])).toBe(2));
  test("third attempt correct: 1", () => expect(itemPoints([W, W, R])).toBe(1));
  test("many attempts: 1", () => expect(itemPoints([...Array(9).fill(W), R])).toBe(1));
  test("never correct: 0", () => expect(itemPoints([W, W, W])).toBe(0));
  test("no attempts: 0", () => expect(itemPoints([])).toBe(0));
  test("a wrong attempt after a correct one changes nothing", () => {
    expect(itemPoints([R, W, W])).toBe(5);
    expect(itemPoints([W, R, W])).toBe(2);
  });
});

describe("summarizeAttempts", () => {
  test("counts attempts and keeps the first correct attempt number", () => {
    const s = summarizeAttempts([a("q1", false), a("q2", true), a("q1", true), a("q1", false)]);
    expect(s.get("q1")).toEqual({ attempts: 3, firstCorrect: 2 });
    expect(s.get("q2")).toEqual({ attempts: 1, firstCorrect: 1 });
    expect(s.get("q3")).toBeUndefined();
  });
});

const items = { questionIds: ["q1", "q2"], taskIds: ["t1"] };
const none = { questionIds: [], taskIds: [] };

type A = ReturnType<typeof a>;
const req = (i: typeof items, quiz: A[], order: A[]) =>
  chapterRequirements(i, summarizeAttempts(quiz), summarizeAttempts(order));
const score = (i: typeof items, quiz: A[], order: A[]) =>
  chapterScore(i, summarizeAttempts(quiz), summarizeAttempts(order));

describe("chapterRequirements", () => {
  test("not done until every question and task is solved", () => {
    const r = req(items, [a("q1", true), a("q2", false)], [a("t1", true)]);
    expect(r).toEqual({
      questions: { total: 2, solved: 1 },
      tasks: { total: 1, solved: 1 },
      done: false,
    });
  });

  test("done when all are solved, even with later wrong attempts", () => {
    const r = req(
      items,
      [a("q1", true), a("q2", false), a("q2", true), a("q1", false)],
      [a("t1", false), a("t1", true), a("t1", false)],
    );
    expect(r.done).toBe(true);
  });

  test("ignores attempts for items not in the chapter", () => {
    const r = req(items, [a("other", true)], []);
    expect(r.questions.solved).toBe(0);
  });

  test("a chapter with nothing to solve is done", () => {
    expect(req(none, [], []).done).toBe(true);
  });
});

describe("chapterScore and storyScore", () => {
  test("sums points per item and counts first-try solves", () => {
    const s = score(
      items,
      [a("q1", true), a("q2", false), a("q2", true)],
      [a("t1", false), a("t1", false), a("t1", false)],
    );
    expect(s).toEqual({ points: 7, max: 15, firstTry: 1, items: 3 });
  });

  test("empty chapter scores 0/0", () => {
    expect(score(none, [], [])).toEqual({
      points: 0,
      max: 0,
      firstTry: 0,
      items: 0,
    });
  });

  test("story score adds chapter scores", () => {
    expect(
      storyScore([
        { points: 7, max: 15, firstTry: 1, items: 3 },
        { points: 10, max: 10, firstTry: 2, items: 2 },
      ]),
    ).toEqual({ points: 17, max: 25, firstTry: 3, items: 5 });
    expect(storyScore([])).toEqual({ points: 0, max: 0, firstTry: 0, items: 0 });
  });
});

describe("chapterLock", () => {
  const orders = [1, 2, 3];
  test("the first chapter is open", () => {
    expect(chapterLock(1, orders, [])).toEqual({ locked: false });
  });
  test("open when the previous chapter is completed", () => {
    expect(chapterLock(2, orders, [1])).toEqual({ locked: false });
  });
  test("locked when the previous chapter is not completed", () => {
    expect(chapterLock(3, orders, [1])).toEqual({ locked: true, requiredOrder: 2 });
  });
  test("a completed chapter stays open even if the previous is not", () => {
    expect(chapterLock(3, orders, [3])).toEqual({ locked: false });
  });
  test("gaps in orders use the previous published chapter", () => {
    expect(chapterLock(5, [1, 3, 5], [1])).toEqual({ locked: true, requiredOrder: 3 });
    expect(chapterLock(5, [5, 1, 3], [3])).toEqual({ locked: false });
    expect(chapterLock(3, [1, 3, 5], [])).toEqual({ locked: true, requiredOrder: 1 });
  });
});

describe("storyProgress", () => {
  test("nothing done", () => {
    expect(storyProgress([1, 2, 3], [])).toEqual({
      completed: 0,
      total: 3,
      percent: 0,
      nextOrder: 1,
    });
  });
  test("partly done, rounded percent, next is the first incomplete", () => {
    expect(storyProgress([3, 1, 2], [1, 3])).toEqual({
      completed: 2,
      total: 3,
      percent: 67,
      nextOrder: 2,
    });
  });
  test("all done", () => {
    expect(storyProgress([1, 2], [1, 2])).toEqual({
      completed: 2,
      total: 2,
      percent: 100,
      nextOrder: null,
    });
  });
  test("ignores completed chapters that are no longer published", () => {
    expect(storyProgress([1], [1, 9]).completed).toBe(1);
  });
  test("a story without chapters is 0%", () => {
    expect(storyProgress([], []).percent).toBe(0);
  });
});

describe("pickResume", () => {
  const p = (nextOrder: number | null) => ({ completed: 0, total: 2, percent: 0, nextOrder });
  test("picks the most recent unfinished story", () => {
    const stories = [
      { slug: "old", lastActivity: new Date("2026-10-01"), progress: p(2) },
      { slug: "done", lastActivity: new Date("2026-10-20"), progress: p(null) },
      { slug: "new", lastActivity: new Date("2026-10-10"), progress: p(1) },
      { slug: "never", lastActivity: null, progress: p(1) },
    ];
    expect(pickResume(stories)?.slug).toBe("new");
  });
  test("null when nothing was started", () => {
    expect(pickResume([{ lastActivity: null, progress: p(1) }])).toBeNull();
  });
});

describe("labels", () => {
  test("Bengali digits", () => {
    expect(scoreLabel(5, 5)).toBe("৫/৫");
    expect(attemptLabel(2)).toBe("চেষ্টা ২");
  });
  test("remaining reason", () => {
    expect(remainingLabel({ questions: { total: 4, solved: 1 }, tasks: { total: 1, solved: 0 } })).toBe(
      "আরও ৩টি প্রশ্ন ও ১টি বাক্য বাকি",
    );
    expect(remainingLabel({ questions: { total: 1, solved: 1 }, tasks: { total: 0, solved: 0 } })).toBeNull();
  });
});
