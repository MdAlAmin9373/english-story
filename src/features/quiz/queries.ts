import "server-only";
import { db } from "@/lib/db";
import { parseOptions, seededShuffle, tokenize } from "./check";

// Database reads: call these inside a <Suspense> boundary.
// Callers must check chapter access (features/stories/access.ts) first.

// Never selects correctIndex or the ordered sentence: answers stay on the server.
export async function getChapterQuiz(chapterId: string, userId: string) {
  const [questions, tasks, progress] = await Promise.all([
    db.quizQuestion.findMany({
      where: { chapterId },
      orderBy: { order: "asc" },
      select: { id: true, type: true, promptBn: true, promptEn: true, options: true },
    }),
    db.sentenceOrderTask.findMany({
      where: { chapterId },
      orderBy: { order: "asc" },
      select: { id: true, promptBn: true, en: true },
    }),
    db.userProgress.findUnique({
      where: { userId_chapterId: { userId, chapterId } },
      select: { completedAt: true },
    }),
  ]);

  return {
    questions: questions.flatMap(({ options, ...q }) => {
      const parsed = parseOptions(options);
      return parsed ? [{ ...q, options: parsed }] : [];
    }),
    orderTasks: tasks.map(({ id, promptBn, en }) => ({
      id,
      promptBn,
      tokens: seededShuffle(tokenize(en), id),
    })),
    completed: progress !== null,
  };
}

export type ChapterQuiz = Awaited<ReturnType<typeof getChapterQuiz>>;

// Answers for items the user has ALREADY solved (ids computed on the server from stored
// attempts), so a reloaded page can show them. Never call this with unsolved ids.
export async function getSolvedAnswers(questionIds: string[], taskIds: string[]) {
  const [questions, tasks] = await Promise.all([
    questionIds.length
      ? db.quizQuestion.findMany({
          where: { id: { in: questionIds } },
          select: { id: true, correctIndex: true },
        })
      : [],
    taskIds.length
      ? db.sentenceOrderTask.findMany({
          where: { id: { in: taskIds } },
          select: { id: true, en: true },
        })
      : [],
  ]);
  return {
    correctIndex: new Map(questions.map((q) => [q.id, q.correctIndex])),
    answer: new Map(tasks.map((t) => [t.id, t.en])),
  };
}

export async function getUserProgress(userId: string) {
  const [completed, correct] = await Promise.all([
    db.userProgress.findMany({
      where: { userId },
      orderBy: { completedAt: "desc" },
      select: {
        completedAt: true,
        chapter: {
          select: {
            order: true,
            titleBn: true,
            story: { select: { slug: true, titleBn: true } },
          },
        },
      },
    }),
    // Distinct questions answered correctly, so retries do not inflate the count.
    db.quizAttempt.groupBy({
      by: ["questionId"],
      where: { userId, correct: true },
    }),
  ]);

  return { completed, correctCount: correct.length };
}
