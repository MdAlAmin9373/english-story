// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from "vitest";

// Mocked database and session. The real "one row only" guarantee is the database's unique
// key on (userId, item id); these tests check that the action relies on it (skip-duplicates
// insert, never a plain create) and that every guard runs before anything is recorded.
const db = vi.hoisted(() => ({
  quizQuestion: { findFirst: vi.fn() },
  sentenceOrderTask: { findFirst: vi.fn() },
  quizAttempt: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn() },
  orderTaskAttempt: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn() },
  quizHintUse: { createMany: vi.fn(), create: vi.fn(), upsert: vi.fn(), findUnique: vi.fn() },
  orderTaskHintUse: { createMany: vi.fn(), create: vi.fn(), upsert: vi.fn(), findUnique: vi.fn() },
}));
const getCurrentUser = vi.hoisted(() => vi.fn());
const getChapterLock = vi.hoisted(() => vi.fn());

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ refresh: vi.fn() }));
vi.mock("@/lib/db", () => ({ db }));
vi.mock("@/features/auth/session", () => ({ getCurrentUser }));
vi.mock("@/features/progress/queries", () => ({ getChapterLock, getChapterStatus: vi.fn() }));

const { checkOrder, revealHint, submitAnswer } = await import("@/features/quiz/actions");

const HINT = "গ্রামের কথা ভাবুন।\nThink of the first sentence.";
const user = { id: "u1", email: "a@example.com", role: "USER" };
const chapter = { storyId: "s1", order: 2 };
const question = { id: "q1", options: ["a", "b"], correctIndex: 1, hint: HINT, chapter };
const task = { id: "t1", en: "Her name is Mitu.", hint: HINT, chapter };

const nothingRecorded = () => {
  for (const table of [db.quizHintUse, db.orderTaskHintUse]) {
    expect(table.createMany).not.toHaveBeenCalled();
    expect(table.create).not.toHaveBeenCalled();
    expect(table.upsert).not.toHaveBeenCalled();
  }
};

beforeEach(() => {
  vi.clearAllMocks();
  getCurrentUser.mockResolvedValue(user);
  getChapterLock.mockResolvedValue({ locked: false });
  db.quizQuestion.findFirst.mockResolvedValue(question);
  db.sentenceOrderTask.findFirst.mockResolvedValue(task);
  db.quizAttempt.findFirst.mockResolvedValue(null);
  db.orderTaskAttempt.findFirst.mockResolvedValue(null);
  db.quizHintUse.createMany.mockResolvedValue({ count: 1 });
  db.orderTaskHintUse.createMany.mockResolvedValue({ count: 1 });
});

describe.each([
  ["question", db.quizQuestion, db.quizAttempt, db.quizHintUse, { questionId: "q1" }],
  ["task", db.sentenceOrderTask, db.orderTaskAttempt, db.orderTaskHintUse, { taskId: "t1" }],
] as const)("revealHint (%s)", (kind, items, attempts, hintUses, itemKey) => {
  const id = kind === "question" ? "q1" : "t1";
  const other = kind === "question" ? db.orderTaskHintUse : db.quizHintUse;

  test("not logged in: error, nothing loaded or recorded", async () => {
    getCurrentUser.mockResolvedValue(null);
    expect(await revealHint({ kind, id })).toEqual({ ok: false, error: "এটি করতে লগইন করুন।" });
    expect(items.findFirst).not.toHaveBeenCalled();
    nothingRecorded();
  });

  test("invalid input: error, nothing recorded", async () => {
    expect((await revealHint({ kind: "note", id })).ok).toBe(false);
    expect((await revealHint({ kind, id: "" })).ok).toBe(false);
    expect((await revealHint(null)).ok).toBe(false);
    nothingRecorded();
  });

  test("unknown id: error, nothing recorded", async () => {
    items.findFirst.mockResolvedValue(null);
    expect(await revealHint({ kind, id: "nope" })).toEqual({
      ok: false,
      error: "প্রশ্নটি পাওয়া যায়নি।",
    });
    expect(items.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "nope", chapter: { status: "PUBLISHED", story: { status: "PUBLISHED" } } },
      }),
    );
    nothingRecorded();
  });

  test("no hint: error, no lock check, nothing recorded", async () => {
    items.findFirst.mockResolvedValue({ ...(kind === "question" ? question : task), hint: null });
    expect(await revealHint({ kind, id })).toEqual({ ok: false, error: "এখানে কোনো ইঙ্গিত নেই।" });
    expect(getChapterLock).not.toHaveBeenCalled();
    nothingRecorded();
  });

  test("locked chapter: error, nothing recorded", async () => {
    getChapterLock.mockResolvedValue({ locked: true, requiredOrder: 1 });
    expect(await revealHint({ kind, id })).toEqual({ ok: false, error: "আগের অধ্যায় শেষ করুন।" });
    expect(getChapterLock).toHaveBeenCalledWith(chapter, "u1");
    nothingRecorded();
  });

  test("already solved: returns the hint, records nothing", async () => {
    attempts.findFirst.mockResolvedValue({ id: "attempt" });
    expect(await revealHint({ kind, id })).toEqual({ ok: true, hint: HINT });
    expect(attempts.findFirst).toHaveBeenCalledWith({
      where: { userId: "u1", ...itemKey, correct: true },
      select: { id: true },
    });
    nothingRecorded();
  });

  test("unsolved: records once with a skip-duplicates insert, then returns only the hint", async () => {
    const res = await revealHint({ kind, id });
    expect(res).toEqual({ ok: true, hint: HINT }); // exactly these keys, nothing else
    expect(hintUses.createMany).toHaveBeenCalledOnce();
    expect(hintUses.createMany).toHaveBeenCalledWith({
      data: [{ userId: "u1", ...itemKey }],
      skipDuplicates: true,
    });
    expect(hintUses.create).not.toHaveBeenCalled();
    expect(other.createMany).not.toHaveBeenCalled();
  });

  test("two parallel calls: both get the hint, both use the idempotent insert", async () => {
    // The second insert hits the unique key and is skipped by the database (count 0).
    hintUses.createMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });
    const results = await Promise.all([revealHint({ kind, id }), revealHint({ kind, id })]);
    expect(results).toEqual([
      { ok: true, hint: HINT },
      { ok: true, hint: HINT },
    ]);
    expect(hintUses.createMany).toHaveBeenCalledTimes(2);
    for (const [args] of hintUses.createMany.mock.calls) {
      expect(args).toEqual({ data: [{ userId: "u1", ...itemKey }], skipDuplicates: true });
    }
    expect(hintUses.create).not.toHaveBeenCalled();
    expect(hintUses.upsert).not.toHaveBeenCalled();
  });

  test("the hint is recorded only after every check passed", async () => {
    const order: string[] = [];
    getChapterLock.mockImplementation(async () => (order.push("lock"), { locked: false }));
    attempts.findFirst.mockImplementation(async () => (order.push("solved?"), null));
    hintUses.createMany.mockImplementation(async () => (order.push("record"), { count: 1 }));
    await revealHint({ kind, id });
    expect(order).toEqual(["lock", "solved?", "record"]);
  });
});

test("revealHint: a question with broken options is not found (hidden from readers)", async () => {
  db.quizQuestion.findFirst.mockResolvedValue({ ...question, options: "oops" });
  expect((await revealHint({ kind: "question", id: "q1" })).ok).toBe(false);
  nothingRecorded();
});

describe("answer points use the hint record (server decides)", () => {
  beforeEach(() => {
    db.quizAttempt.findMany.mockResolvedValue([{ correct: true }]);
    db.orderTaskAttempt.findMany.mockResolvedValue([{ correct: true }]);
  });

  test("submitAnswer: first try 5 without hint, 1 with hint", async () => {
    db.quizHintUse.findUnique.mockResolvedValue(null);
    const plain = await submitAnswer({ questionId: "q1", chosenIndex: 1 });
    expect(plain.ok && plain.points).toBe(5);

    db.quizHintUse.findUnique.mockResolvedValue({ id: "h" });
    const hinted = await submitAnswer({ questionId: "q1", chosenIndex: 1 });
    expect(hinted.ok && hinted.points).toBe(1);
    expect(db.quizHintUse.findUnique).toHaveBeenCalledWith({
      where: { userId_questionId: { userId: "u1", questionId: "q1" } },
      select: { id: true },
    });
  });

  test("submitAnswer: still wrong with a hint gives 0", async () => {
    db.quizAttempt.findMany.mockResolvedValue([{ correct: false }]);
    db.quizHintUse.findUnique.mockResolvedValue({ id: "h" });
    const res = await submitAnswer({ questionId: "q1", chosenIndex: 0 });
    expect(res.ok && res.points).toBe(0);
  });

  test("checkOrder: third try 1 either way; first try with hint 1", async () => {
    db.orderTaskAttempt.findMany.mockResolvedValue([{ correct: false }, { correct: false }, { correct: true }]);
    db.orderTaskHintUse.findUnique.mockResolvedValue(null);
    const tokens = ["Her", "name", "is", "Mitu."];
    const third = await checkOrder({ taskId: "t1", tokens });
    expect(third.ok && third.points).toBe(1);

    db.orderTaskAttempt.findMany.mockResolvedValue([{ correct: true }]);
    db.orderTaskHintUse.findUnique.mockResolvedValue({ id: "h" });
    const hinted = await checkOrder({ taskId: "t1", tokens });
    expect(hinted.ok && hinted.points).toBe(1);
    expect(db.orderTaskHintUse.findUnique).toHaveBeenCalledWith({
      where: { userId_taskId: { userId: "u1", taskId: "t1" } },
      select: { id: true },
    });
  });
});
