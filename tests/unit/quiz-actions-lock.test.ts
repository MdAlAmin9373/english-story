// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from "vitest";

// Mocked database and session: these tests check the action's order of checks,
// not Prisma itself.
const db = vi.hoisted(() => ({
  quizQuestion: { findFirst: vi.fn() },
  quizAttempt: { create: vi.fn(), findMany: vi.fn() },
  sentenceOrderTask: { findFirst: vi.fn() },
  orderTaskAttempt: { create: vi.fn(), findMany: vi.fn() },
}));
const getCurrentUser = vi.hoisted(() => vi.fn());
const getChapterLock = vi.hoisted(() => vi.fn());

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ refresh: vi.fn() }));
vi.mock("@/lib/db", () => ({ db }));
vi.mock("@/features/auth/session", () => ({ getCurrentUser }));
vi.mock("@/features/progress/queries", () => ({ getChapterLock, getChapterStatus: vi.fn() }));

const { checkOrder, submitAnswer } = await import("@/features/quiz/actions");

const user = { id: "u1", email: "a@example.com", role: "USER" };
const chapter = { storyId: "s1", order: 2 };
const question = { id: "q1", options: ["a", "b", "c"], correctIndex: 1, chapter };
const task = { id: "t1", en: "Her name is Mitu.", chapter };
const LOCKED = "আগের অধ্যায় শেষ করুন।";

beforeEach(() => {
  vi.clearAllMocks();
  getCurrentUser.mockResolvedValue(user);
  db.quizQuestion.findFirst.mockResolvedValue(question);
  db.sentenceOrderTask.findFirst.mockResolvedValue(task);
  db.quizAttempt.findMany.mockResolvedValue([{ correct: true }]);
  db.orderTaskAttempt.findMany.mockResolvedValue([{ correct: true }]);
});

describe("submitAnswer and the chapter lock", () => {
  test("locked chapter: error, nothing recorded", async () => {
    getChapterLock.mockResolvedValue({ locked: true, requiredOrder: 1 });
    const res = await submitAnswer({ questionId: "q1", chosenIndex: 1 });
    expect(res).toEqual({ ok: false, error: LOCKED });
    expect(getChapterLock).toHaveBeenCalledWith(chapter, "u1");
    expect(db.quizAttempt.create).not.toHaveBeenCalled();
  });

  test("open chapter: the attempt is recorded and graded", async () => {
    getChapterLock.mockResolvedValue({ locked: false });
    const res = await submitAnswer({ questionId: "q1", chosenIndex: 1 });
    expect(res).toEqual({ ok: true, attempt: 1, points: 5, correct: true, correctIndex: 1 });
    expect(db.quizAttempt.create).toHaveBeenCalledOnce();
  });

  test("not logged in: no lock check, nothing recorded", async () => {
    getCurrentUser.mockResolvedValue(null);
    const res = await submitAnswer({ questionId: "q1", chosenIndex: 1 });
    expect(res.ok).toBe(false);
    expect(getChapterLock).not.toHaveBeenCalled();
    expect(db.quizAttempt.create).not.toHaveBeenCalled();
  });
});

describe("checkOrder and the chapter lock", () => {
  const tokens = ["Her", "name", "is", "Mitu."];

  test("locked chapter: error, nothing recorded", async () => {
    getChapterLock.mockResolvedValue({ locked: true, requiredOrder: 1 });
    const res = await checkOrder({ taskId: "t1", tokens });
    expect(res).toEqual({ ok: false, error: LOCKED });
    expect(getChapterLock).toHaveBeenCalledWith(chapter, "u1");
    expect(db.orderTaskAttempt.create).not.toHaveBeenCalled();
  });

  test("open chapter: the attempt is recorded and graded", async () => {
    getChapterLock.mockResolvedValue({ locked: false });
    const res = await checkOrder({ taskId: "t1", tokens });
    expect(res).toEqual({ ok: true, attempt: 1, points: 5, correct: true, answer: task.en });
    expect(db.orderTaskAttempt.create).toHaveBeenCalledOnce();
  });
});
