// @vitest-environment node
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { ChapterStatus } from "@/features/progress/queries";

// Renders the real ChapterQuiz server component (real queries, mocked database) to HTML,
// the way the chapter page streams it.
const db = vi.hoisted(() => ({
  quizQuestion: { findMany: vi.fn() },
  sentenceOrderTask: { findMany: vi.fn() },
  userProgress: { findUnique: vi.fn() },
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ db }));
vi.mock("@/features/quiz/actions", () => ({
  submitAnswer: vi.fn(),
  checkOrder: vi.fn(),
  completeChapter: vi.fn(),
  revealHint: vi.fn(),
}));

const { ChapterQuiz } = await import("@/features/quiz/components/ChapterQuiz");
const { QuizProgressProvider } = await import("@/features/quiz/components/QuizProgress");

const Q_HINT = "SECRET_Q_HINT গ্রামের কথা ভাবুন";
const T_HINT = "SECRET_T_HINT শুরুতে Her";
const BUTTON = "💡 ইঙ্গিত দেখুন";

const questions = [
  { id: "q1", type: "MULTIPLE_CHOICE", promptBn: "রাতুল কোথায় থাকে?", promptEn: "Where?", options: ["city", "village"], hint: Q_HINT, correctIndex: 1 },
  { id: "q2", type: "FILL_GAP", promptBn: "পূরণ", promptEn: "Rina ___ .", options: ["a", "b"], hint: null, correctIndex: 0 },
];
const tasks = [{ id: "t1", promptBn: "তার নাম মিতু।", en: "Her name is Mitu.", hint: T_HINT }];

beforeEach(() => {
  vi.clearAllMocks();
  // getChapterQuiz lists the chapter; getSolvedAnswers asks for solved ids only.
  db.quizQuestion.findMany.mockImplementation(async (args: { where: { id?: { in: string[] } } }) =>
    args.where.id
      ? questions.filter((q) => args.where.id!.in.includes(q.id)).map(({ id, correctIndex }) => ({ id, correctIndex }))
      : questions.map((q) => ({ ...q, correctIndex: undefined })),
  );
  db.sentenceOrderTask.findMany.mockImplementation(async (args: { where: { id?: { in: string[] } } }) =>
    args.where.id ? tasks.filter((t) => args.where.id!.in.includes(t.id)) : tasks,
  );
  db.userProgress.findUnique.mockResolvedValue(null);
});

function status(over: Partial<ChapterStatus> = {}): ChapterStatus {
  return {
    requirements: { questions: { total: 2, solved: 0 }, tasks: { total: 1, solved: 0 }, done: false },
    score: { points: 0, max: 15, firstTry: 0, items: 3 },
    solvedQuestions: {},
    solvedTasks: {},
    hintQuestionIds: [],
    hintTaskIds: [],
    ...over,
  };
}

async function html(s: ChapterStatus) {
  const element = await ChapterQuiz({ chapterId: "c1", userId: "u1", status: s });
  return renderToString(
    <QuizProgressProvider
      questionTotal={2}
      taskTotal={1}
      solvedQuestions={s.solvedQuestions}
      solvedTasks={s.solvedTasks}
    >
      {element}
    </QuizProgressProvider>,
  );
}

const count = (text: string, part: string) => text.split(part).length - 1;

describe("server-rendered chapter quiz", () => {
  test("unsolved, not revealed: no hint text in the HTML, a button where a hint exists", async () => {
    const out = await html(status());
    expect(out).not.toContain("SECRET_Q_HINT");
    expect(out).not.toContain("SECRET_T_HINT");
    expect(out).not.toContain('role="note"');
    expect(count(out, BUTTON)).toBe(2); // q1 and t1; q2 has no hint
    expect(out).toContain("ইঙ্গিত দেখলে এই প্রশ্নে সর্বোচ্চ ১ নম্বর পাবেন।");
  });

  test("solved without a hint record: neither button nor text", async () => {
    const out = await html(
      status({
        solvedQuestions: { q1: 5 },
        solvedTasks: { t1: 5 },
        requirements: { questions: { total: 2, solved: 1 }, tasks: { total: 1, solved: 1 }, done: false },
      }),
    );
    expect(out).not.toContain("SECRET_");
    expect(out).not.toContain(BUTTON);
  });

  test("revealed by this user: the hint is shown again after a reload", async () => {
    const out = await html(status({ hintQuestionIds: ["q1"] }));
    expect(out).toContain("SECRET_Q_HINT");
    expect(out).toContain('role="note"');
    expect(out).not.toContain("SECRET_T_HINT");
    expect(count(out, BUTTON)).toBe(1); // only t1 still offers its hint
  });
});
