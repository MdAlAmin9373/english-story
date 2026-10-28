"use server";

import { refresh } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/features/auth/session";
import { itemPoints } from "@/features/progress/progress";
import { getChapterLock, getChapterStatus } from "@/features/progress/queries";
import { isCorrectChoice, isCorrectOrder, parseOptions } from "./check";
import { answerSchema, chapterSchema, orderSchema } from "./schemas";

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

const MSG = {
  loginRequired: "এটি করতে লগইন করুন।",
  invalid: "অনুরোধটি সঠিক নয়।",
  notFound: "প্রশ্নটি পাওয়া যায়নি।",
  locked: "আগের অধ্যায় শেষ করুন।",
  unfinished: "সব প্রশ্ন ও বাক্য সাজানো সঠিক করুন।",
} as const;

// Logged-in users may read every published chapter (see features/stories/access.ts).
const published = { status: "PUBLISHED", story: { status: "PUBLISHED" } } as const;
const oldestFirst = { createdAt: "asc" } as const;

// Every attempt is recorded; unlimited retries are allowed.
export async function submitAnswer(input: unknown): Promise<AnswerResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: MSG.loginRequired };

  const parsed = answerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: MSG.invalid };
  const { questionId, chosenIndex } = parsed.data;

  const question = await db.quizQuestion.findFirst({
    where: { id: questionId, chapter: published },
    select: { id: true, options: true, correctIndex: true },
  });
  const options = question && parseOptions(question.options);
  if (!question || !options) return { ok: false, error: MSG.notFound };
  if (chosenIndex >= options.length) return { ok: false, error: MSG.invalid };

  const correct = isCorrectChoice(question.correctIndex, chosenIndex, options.length);
  await db.quizAttempt.create({
    data: { userId: user.id, questionId: question.id, chosenIndex, correct },
  });
  const attempts = await db.quizAttempt.findMany({
    where: { userId: user.id, questionId: question.id },
    orderBy: oldestFirst,
    select: { correct: true },
  });

  const graded = { ok: true, attempt: attempts.length, points: itemPoints(attempts) } as const;
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
    select: { id: true, en: true },
  });
  if (!task) return { ok: false, error: MSG.notFound };

  const correct = isCorrectOrder(task.en, tokens);
  await db.orderTaskAttempt.create({ data: { userId: user.id, taskId: task.id, correct } });
  const attempts = await db.orderTaskAttempt.findMany({
    where: { userId: user.id, taskId: task.id },
    orderBy: oldestFirst,
    select: { correct: true },
  });

  const graded = { ok: true, attempt: attempts.length, points: itemPoints(attempts) } as const;
  return correct ? { ...graded, correct, answer: task.en } : { ...graded, correct };
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
