"use server";

import { refresh } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/features/auth/session";
import { isCorrectChoice, isCorrectOrder, parseOptions } from "./check";
import { answerSchema, chapterSchema, orderSchema } from "./schemas";

type Failure = { ok: false; error: string };
export type AnswerResult = { ok: true; correct: boolean; correctIndex: number } | Failure;
export type OrderResult = { ok: true; correct: boolean; answer: string } | Failure;
export type CompleteResult = { ok: true } | Failure;

const MSG = {
  loginRequired: "এটি করতে লগইন করুন।",
  invalid: "অনুরোধটি সঠিক নয়।",
  notFound: "প্রশ্নটি পাওয়া যায়নি।",
} as const;

// Logged-in users may read every published chapter (see features/stories/access.ts).
const published = { status: "PUBLISHED", story: { status: "PUBLISHED" } } as const;

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

  return { ok: true, correct, correctIndex: question.correctIndex };
}

// Not recorded: the dashboard counts quiz questions only.
export async function checkOrder(input: unknown): Promise<OrderResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: MSG.loginRequired };

  const parsed = orderSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: MSG.invalid };
  const { taskId, tokens } = parsed.data;

  const task = await db.sentenceOrderTask.findFirst({
    where: { id: taskId, chapter: published },
    select: { en: true },
  });
  if (!task) return { ok: false, error: MSG.notFound };

  return { ok: true, correct: isCorrectOrder(task.en, tokens), answer: task.en };
}

export async function completeChapter(input: unknown): Promise<CompleteResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: MSG.loginRequired };

  const parsed = chapterSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: MSG.invalid };

  const chapter = await db.chapter.findFirst({
    where: { id: parsed.data.chapterId, ...published },
    select: { id: true },
  });
  if (!chapter) return { ok: false, error: MSG.notFound };

  // Keeps the first completedAt if the chapter is completed again.
  await db.userProgress.upsert({
    where: { userId_chapterId: { userId: user.id, chapterId: chapter.id } },
    create: { userId: user.id, chapterId: chapter.id },
    update: {},
  });
  refresh();
  return { ok: true };
}
