"use server";

import { refresh } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/features/auth/session";
import { itemPoints } from "@/features/progress/progress";
import { getChapterLock, getChapterStatus } from "@/features/progress/queries";
import { isCorrectChoice, isCorrectOrder, parseOptions } from "./check";
import { answerSchema, chapterSchema, hintSchema, orderSchema } from "./schemas";

type Failure = { ok: false; error: string };
// attempt is this attempt's number for the item; points are from the first correct attempt.
type Graded = { ok: true; attempt: number; points: number };
// The answer is revealed only after a correct attempt, so retries stay honest.
export type AnswerResult =
  | (Graded & { correct: true; correctIndex: number })
  | (Graded & { correct: false })
  | Failure;
export type OrderResult =
  | (Graded & { correct: true; answer: string })
  | (Graded & { correct: false })
  | Failure;
export type CompleteResult = { ok: true } | Failure;
// Only the hint text, nothing else about the item.
export type HintResult = { ok: true; hint: string } | Failure;

const MSG = {
  loginRequired: "এটি করতে লগইন করুন।",
  invalid: "অনুরোধটি সঠিক নয়।",
  notFound: "প্রশ্নটি পাওয়া যায়নি।",
  noHint: "এখানে কোনো ইঙ্গিত নেই।",
  locked: "আগের অধ্যায় শেষ করুন।",
  unfinished: "সব প্রশ্ন ও বাক্য সাজানো সঠিক করুন।",
} as const;

// Logged-in users may read every published chapter (see features/stories/access.ts).
const published = { status: "PUBLISHED", story: { status: "PUBLISHED" } } as const;
const oldestFirst = { createdAt: "asc" } as const;
// Enough of the chapter to check the sequential lock.
const lockFields = { chapter: { select: { storyId: true, order: true } } } as const;

// Every attempt is recorded; unlimited retries are allowed.
// A locked chapter records nothing, same as completeChapter.
export async function submitAnswer(input: unknown): Promise<AnswerResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: MSG.loginRequired };

  const parsed = answerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: MSG.invalid };
  const { questionId, chosenIndex } = parsed.data;

  const question = await db.quizQuestion.findFirst({
    where: { id: questionId, chapter: published },
    select: { id: true, options: true, correctIndex: true, ...lockFields },
  });
  const options = question && parseOptions(question.options);
  if (!question || !options) return { ok: false, error: MSG.notFound };
  if (chosenIndex >= options.length) return { ok: false, error: MSG.invalid };
  if ((await getChapterLock(question.chapter, user.id)).locked) {
    return { ok: false, error: MSG.locked };
  }

  const correct = isCorrectChoice(question.correctIndex, chosenIndex, options.length);
  await db.quizAttempt.create({
    data: { userId: user.id, questionId: question.id, chosenIndex, correct },
  });
  const [attempts, hintUse] = await Promise.all([
    db.quizAttempt.findMany({
      where: { userId: user.id, questionId: question.id },
      orderBy: oldestFirst,
      select: { correct: true },
    }),
    db.quizHintUse.findUnique({
      where: { userId_questionId: { userId: user.id, questionId: question.id } },
      select: { id: true },
    }),
  ]);

  const points = itemPoints(attempts, hintUse !== null);
  const graded = { ok: true, attempt: attempts.length, points } as const;
  return correct
    ? { ...graded, correct, correctIndex: question.correctIndex }
    : { ...graded, correct };
}

export async function checkOrder(input: unknown): Promise<OrderResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: MSG.loginRequired };

  const parsed = orderSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: MSG.invalid };
  const { taskId, tokens } = parsed.data;

  const task = await db.sentenceOrderTask.findFirst({
    where: { id: taskId, chapter: published },
    select: { id: true, en: true, ...lockFields },
  });
  if (!task) return { ok: false, error: MSG.notFound };
  if ((await getChapterLock(task.chapter, user.id)).locked) {
    return { ok: false, error: MSG.locked };
  }

  const correct = isCorrectOrder(task.en, tokens);
  await db.orderTaskAttempt.create({ data: { userId: user.id, taskId: task.id, correct } });
  const [attempts, hintUse] = await Promise.all([
    db.orderTaskAttempt.findMany({
      where: { userId: user.id, taskId: task.id },
      orderBy: oldestFirst,
      select: { correct: true },
    }),
    db.orderTaskHintUse.findUnique({
      where: { userId_taskId: { userId: user.id, taskId: task.id } },
      select: { id: true },
    }),
  ]);

  const points = itemPoints(attempts, hintUse !== null);
  const graded = { ok: true, attempt: attempts.length, points } as const;
  return correct ? { ...graded, correct, answer: task.en } : { ...graded, correct };
}

// Reveals a hint. It is recorded only while the item is unsolved, so a record always means
// "hint used before the first correct answer" (points capped, see itemScore). Recording is
// an INSERT … ON CONFLICT DO NOTHING on (userId, item id): double clicks and parallel
// requests can never create two rows.
export async function revealHint(input: unknown): Promise<HintResult> {
  // 1. Logged in.
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: MSG.loginRequired };

  const parsed = hintSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: MSG.invalid };
  const { kind, id } = parsed.data;
  const where = { id, chapter: published };
  const select = { id: true, hint: true, ...lockFields } as const;

  // 2. The item exists (as readers see it) and has a hint.
  const item =
    kind === "question"
      ? await db.quizQuestion
          .findFirst({ where, select: { ...select, options: true } })
          .then((q) => (q && parseOptions(q.options) ? q : null))
      : await db.sentenceOrderTask.findFirst({ where, select });
  if (!item) return { ok: false, error: MSG.notFound };
  if (!item.hint) return { ok: false, error: MSG.noHint };

  // 3. The chapter is open for this user.
  if ((await getChapterLock(item.chapter, user.id)).locked) {
    return { ok: false, error: MSG.locked };
  }

  // 4. Already solved: show the hint, record nothing (no penalty after the fact).
  const userId = user.id;
  const solved =
    kind === "question"
      ? await db.quizAttempt.findFirst({
          where: { userId, questionId: item.id, correct: true },
          select: { id: true },
        })
      : await db.orderTaskAttempt.findFirst({
          where: { userId, taskId: item.id, correct: true },
          select: { id: true },
        });

  // 5. Otherwise record the use (idempotent), and only then return the text.
  if (!solved) {
    if (kind === "question") {
      await db.quizHintUse.createMany({
        data: [{ userId, questionId: item.id }],
        skipDuplicates: true,
      });
    } else {
      await db.orderTaskHintUse.createMany({
        data: [{ userId, taskId: item.id }],
        skipDuplicates: true,
      });
    }
  }
  return { ok: true, hint: item.hint };
}

// Re-checks the lock and the requirements on the server; the button state is never trusted.
export async function completeChapter(input: unknown): Promise<CompleteResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: MSG.loginRequired };

  const parsed = chapterSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: MSG.invalid };

  const chapter = await db.chapter.findFirst({
    where: { id: parsed.data.chapterId, ...published },
    select: { id: true, order: true, storyId: true },
  });
  if (!chapter) return { ok: false, error: MSG.notFound };

  // A completed chapter stays completed, even if questions were added later.
  const existing = await db.userProgress.findUnique({
    where: { userId_chapterId: { userId: user.id, chapterId: chapter.id } },
    select: { id: true },
  });
  if (existing) return { ok: true };

  const [lock, status] = await Promise.all([
    getChapterLock(chapter, user.id),
    getChapterStatus(chapter.id, user.id),
  ]);
  if (lock.locked) return { ok: false, error: MSG.locked };
  if (!status.requirements.done) return { ok: false, error: MSG.unfinished };

  // Keeps the first completedAt if two requests race.
  await db.userProgress.upsert({
    where: { userId_chapterId: { userId: user.id, chapterId: chapter.id } },
    create: { userId: user.id, chapterId: chapter.id },
    update: {},
  });
  refresh();
  return { ok: true };
}
