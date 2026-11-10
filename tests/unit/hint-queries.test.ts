// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from "vitest";
import { publicHint } from "@/features/quiz/hint";

const db = vi.hoisted(() => ({
  quizQuestion: { findMany: vi.fn() },
  sentenceOrderTask: { findMany: vi.fn() },
  userProgress: { findUnique: vi.fn(), findMany: vi.fn() },
  quizAttempt: { findMany: vi.fn() },
  orderTaskAttempt: { findMany: vi.fn() },
  quizHintUse: { findMany: vi.fn() },
  orderTaskHintUse: { findMany: vi.fn() },
  story: { findMany: vi.fn() },
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ db }));

const { getChapterQuiz } = await import("@/features/quiz/queries");
const { getChapterStatus, getStoryProgress } = await import("@/features/progress/queries");

const SECRET_Q = "SECRET_QUESTION_HINT ইঙ্গিত";
const SECRET_T = "SECRET_TASK_HINT ইঙ্গিত";
const none = { questions: new Set<string>(), tasks: new Set<string>() };

const questionRows = [
  { id: "q1", type: "MULTIPLE_CHOICE", promptBn: "প্র১", promptEn: "Q1", options: ["a", "b"], hint: SECRET_Q },
  { id: "q2", type: "FILL_GAP", promptBn: "প্র২", promptEn: "Rina ___ .", options: ["a", "b"], hint: null },
];
const taskRows = [{ id: "t1", promptBn: "কাজ", en: "Her name is Mitu.", hint: SECRET_T }];

beforeEach(() => {
  vi.clearAllMocks();
  db.quizQuestion.findMany.mockResolvedValue(questionRows);
  db.sentenceOrderTask.findMany.mockResolvedValue(taskRows);
  db.userProgress.findUnique.mockResolvedValue(null);
  db.userProgress.findMany.mockResolvedValue([]);
  db.quizAttempt.findMany.mockResolvedValue([]);
  db.orderTaskAttempt.findMany.mockResolvedValue([]);
  db.quizHintUse.findMany.mockResolvedValue([]);
  db.orderTaskHintUse.findMany.mockResolvedValue([]);
});

describe("publicHint", () => {
  test("only says whether a hint exists until it is revealed", () => {
    expect(publicHint("text", false)).toEqual({ hasHint: true, hint: null });
    expect(publicHint("text", true)).toEqual({ hasHint: true, hint: "text" });
    expect(publicHint(null, true)).toEqual({ hasHint: false, hint: null });
    expect(publicHint("", true)).toEqual({ hasHint: false, hint: null });
  });
});

describe("getChapterQuiz (data that becomes the page's props)", () => {
  test("unrevealed: no hint text anywhere, only hasHint", async () => {
    const quiz = await getChapterQuiz("c1", "u1", none);
    const json = JSON.stringify(quiz);
    expect(json).not.toContain("SECRET_QUESTION_HINT");
    expect(json).not.toContain("SECRET_TASK_HINT");
    expect(quiz.questions.map((q) => [q.id, q.hasHint, q.hint])).toEqual([
      ["q1", true, null],
      ["q2", false, null],
    ]);
    expect(quiz.orderTasks[0]).toMatchObject({ id: "t1", hasHint: true, hint: null });
  });

  test("revealed by this user: the text comes back for that item only", async () => {
    const quiz = await getChapterQuiz("c1", "u1", { questions: new Set(["q1"]), tasks: new Set() });
    expect(quiz.questions[0].hint).toBe(SECRET_Q);
    expect(JSON.stringify(quiz)).not.toContain("SECRET_TASK_HINT");
  });

  test("question and task ids are not mixed up", async () => {
    const quiz = await getChapterQuiz("c1", "u1", { questions: new Set(["t1"]), tasks: new Set(["q1"]) });
    expect(JSON.stringify(quiz)).not.toContain("SECRET_");
  });
});

describe("getChapterStatus", () => {
  beforeEach(() => {
    db.quizQuestion.findMany.mockResolvedValue(questionRows.map(({ id, options }) => ({ id, options })));
    db.sentenceOrderTask.findMany.mockResolvedValue([{ id: "t1" }]);
    db.quizAttempt.findMany.mockResolvedValue([
      { questionId: "q1", correct: true },
      { questionId: "q2", correct: false },
      { questionId: "q2", correct: true },
    ]);
    db.orderTaskAttempt.findMany.mockResolvedValue([{ taskId: "t1", correct: true }]);
  });

  test("no hint records: same score and seed as before hints existed", async () => {
    const status = await getChapterStatus("c1", "u1");
    expect(status.score).toEqual({ points: 12, max: 15, firstTry: 2, items: 3 });
    expect(status.solvedQuestions).toEqual({ q1: 5, q2: 2 });
    expect(status.solvedTasks).toEqual({ t1: 5 });
    expect(status.hintQuestionIds).toEqual([]);
    expect(status.hintTaskIds).toEqual([]);
  });

  test("hint records cap those items at 1 and are listed for the reload", async () => {
    db.quizHintUse.findMany.mockResolvedValue([{ questionId: "q1" }]);
    db.orderTaskHintUse.findMany.mockResolvedValue([{ taskId: "t1" }]);
    const status = await getChapterStatus("c1", "u1");
    expect(status.score).toEqual({ points: 4, max: 15, firstTry: 0, items: 3 });
    expect(status.solvedQuestions).toEqual({ q1: 1, q2: 2 });
    expect(status.solvedTasks).toEqual({ t1: 1 });
    expect(status.hintQuestionIds).toEqual(["q1"]);
    expect(status.hintTaskIds).toEqual(["t1"]);
    // One query per table for the whole chapter, scoped to this user.
    expect(db.quizHintUse.findMany).toHaveBeenCalledOnce();
    expect(db.quizHintUse.findMany).toHaveBeenCalledWith({
      where: { userId: "u1", question: { chapterId: "c1" } },
      select: { questionId: true },
    });
  });
});

describe("getStoryProgress (story page and dashboard totals)", () => {
  const chapter = (id: string, order: number, q: string, t: string) => ({
    id,
    order,
    titleBn: id,
    titleEn: id,
    requiresLogin: true,
    quizQuestions: [{ id: q, options: ["a", "b"] }],
    orderTasks: [{ id: t }],
  });

  beforeEach(() => {
    db.story.findMany.mockResolvedValue([
      { id: "s1", slug: "s", titleBn: "গল্প", chapters: [chapter("c1", 1, "q1", "t1"), chapter("c2", 2, "q2", "t2")] },
    ]);
    const at = new Date("2026-11-01");
    db.quizAttempt.findMany.mockResolvedValue([
      { questionId: "q1", correct: true, createdAt: at },
      { questionId: "q2", correct: true, createdAt: at },
    ]);
    db.orderTaskAttempt.findMany.mockResolvedValue([
      { taskId: "t1", correct: true, createdAt: at },
      { taskId: "t2", correct: true, createdAt: at },
    ]);
  });

  test("no hint records: totals unchanged", async () => {
    const story = await getStoryProgress("s", "u1");
    expect(story?.chapters.map((c) => c.score.points)).toEqual([10, 10]);
    expect(story?.score).toEqual({ points: 20, max: 20, firstTry: 4, items: 4 });
  });

  test("hint records cap per item across chapters, with one query per table", async () => {
    db.quizHintUse.findMany.mockResolvedValue([{ questionId: "q2" }]);
    db.orderTaskHintUse.findMany.mockResolvedValue([{ taskId: "t1" }]);
    const story = await getStoryProgress("s", "u1");
    expect(story?.chapters.map((c) => c.score.points)).toEqual([6, 6]);
    expect(story?.score).toEqual({ points: 12, max: 20, firstTry: 2, items: 4 });
    expect(db.quizHintUse.findMany).toHaveBeenCalledOnce();
    expect(db.orderTaskHintUse.findMany).toHaveBeenCalledOnce();
  });
});
