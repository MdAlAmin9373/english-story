import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { parseOptions } from "@/features/quiz/check";
import {
  chapterLock,
  chapterRequirements,
  chapterScore,
  storyProgress,
  storyScore,
  summarizeAttempts,
  type ChapterItems,
} from "./progress";

// Database reads: call these inside a <Suspense> boundary.
// Scores are always computed here from stored attempts, never trusted from the browser.

const oldestFirst = { createdAt: "asc" } as const;

// Questions with broken options are hidden from readers (see quiz/queries.ts),
// so they must not count as requirements either.
function validQuestionIds(questions: { id: string; options: Prisma.JsonValue }[]) {
  return questions.filter((q) => parseOptions(q.options)).map((q) => q.id);
}

export async function getChapterStatus(chapterId: string, userId: string) {
  const [questions, tasks, quizAttempts, orderAttempts] = await Promise.all([
    db.quizQuestion.findMany({ where: { chapterId }, select: { id: true, options: true } }),
    db.sentenceOrderTask.findMany({ where: { chapterId }, select: { id: true } }),
    db.quizAttempt.findMany({
      where: { userId, question: { chapterId } },
      orderBy: oldestFirst,
      select: { questionId: true, correct: true },
    }),
    db.orderTaskAttempt.findMany({
      where: { userId, task: { chapterId } },
      orderBy: oldestFirst,
      select: { taskId: true, correct: true },
    }),
  ]);

  const items: ChapterItems = {
    questionIds: validQuestionIds(questions),
    taskIds: tasks.map((t) => t.id),
  };
  const quiz = summarizeAttempts(quizAttempts.map((a) => ({ itemId: a.questionId, correct: a.correct })));
  const order = summarizeAttempts(orderAttempts.map((a) => ({ itemId: a.taskId, correct: a.correct })));

  return {
    requirements: chapterRequirements(items, quiz, order),
    score: chapterScore(items, quiz, order),
    quiz, // per question: attempts and first-correct attempt number
    order, // per task
  };
}

export type ChapterStatus = Awaited<ReturnType<typeof getChapterStatus>>;

// Lock for a logged-in user; publishedOrders may be passed when the caller already has them.
export async function getChapterLock(
  chapter: { storyId: string; order: number },
  userId: string,
  publishedOrders?: readonly number[],
) {
  const [orders, completed] = await Promise.all([
    publishedOrders ??
      db.chapter
        .findMany({
          where: { storyId: chapter.storyId, status: "PUBLISHED" },
          select: { order: true },
        })
        .then((rows) => rows.map((r) => r.order)),
    db.userProgress.findMany({
      where: { userId, chapter: { storyId: chapter.storyId } },
      select: { chapter: { select: { order: true } } },
    }),
  ]);
  return chapterLock(
    chapter.order,
    orders,
    completed.map((c) => c.chapter.order),
  );
}

// Progress for many stories with a fixed number of queries (no per-story loop).
async function getStoriesProgress(userId: string, storyWhere: Prisma.StoryWhereInput) {
  const where = { ...storyWhere, status: "PUBLISHED" } as const;
  const chapterWhere = { status: "PUBLISHED", story: where } as const;

  const [stories, completions, quizAttempts, orderAttempts] = await Promise.all([
    db.story.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        slug: true,
        titleBn: true,
        chapters: {
          where: { status: "PUBLISHED" },
          orderBy: { order: "asc" },
          select: {
            id: true,
            order: true,
            titleBn: true,
            titleEn: true,
            requiresLogin: true,
            quizQuestions: { select: { id: true, options: true } },
            orderTasks: { select: { id: true } },
          },
        },
      },
    }),
    db.userProgress.findMany({
      where: { userId, chapter: chapterWhere },
      select: { chapterId: true, completedAt: true },
    }),
    db.quizAttempt.findMany({
      where: { userId, question: { chapter: chapterWhere } },
      orderBy: oldestFirst,
      select: { questionId: true, correct: true, createdAt: true },
    }),
    db.orderTaskAttempt.findMany({
      where: { userId, task: { chapter: chapterWhere } },
      orderBy: oldestFirst,
      select: { taskId: true, correct: true, createdAt: true },
    }),
  ]);

  const quiz = summarizeAttempts(quizAttempts.map((a) => ({ itemId: a.questionId, correct: a.correct })));
  const order = summarizeAttempts(orderAttempts.map((a) => ({ itemId: a.taskId, correct: a.correct })));
  const completedAt = new Map(completions.map((c) => [c.chapterId, c.completedAt]));

  // Latest activity per chapter: a completion or any attempt.
  const itemChapter = new Map<string, string>();
  for (const s of stories) {
    for (const c of s.chapters) {
      for (const q of c.quizQuestions) itemChapter.set(q.id, c.id);
      for (const t of c.orderTasks) itemChapter.set(t.id, c.id);
    }
  }
  const lastByChapter = new Map<string, Date>();
  const touch = (chapterId: string | undefined, at: Date) => {
    if (!chapterId) return;
    const prev = lastByChapter.get(chapterId);
    if (!prev || at > prev) lastByChapter.set(chapterId, at);
  };
  for (const [chapterId, at] of completedAt) touch(chapterId, at);
  for (const a of quizAttempts) touch(itemChapter.get(a.questionId), a.createdAt);
  for (const a of orderAttempts) touch(itemChapter.get(a.taskId), a.createdAt);

  return stories.map((story) => {
    const publishedOrders = story.chapters.map((c) => c.order);
    const completedOrders = story.chapters.filter((c) => completedAt.has(c.id)).map((c) => c.order);

    const chapters = story.chapters.map((c) => {
      const items: ChapterItems = {
        questionIds: validQuestionIds(c.quizQuestions),
        taskIds: c.orderTasks.map((t) => t.id),
      };
      return {
        id: c.id,
        order: c.order,
        titleBn: c.titleBn,
        titleEn: c.titleEn,
        requiresLogin: c.requiresLogin,
        completed: completedAt.has(c.id),
        lock: chapterLock(c.order, publishedOrders, completedOrders),
        score: chapterScore(items, quiz, order),
      };
    });

    const activity = story.chapters
      .map((c) => lastByChapter.get(c.id))
      .filter((d): d is Date => d !== undefined);

    return {
      id: story.id,
      slug: story.slug,
      titleBn: story.titleBn,
      chapters,
      progress: storyProgress(publishedOrders, completedOrders),
      score: storyScore(chapters.map((c) => c.score)),
      lastActivity: activity.length ? new Date(Math.max(...activity.map((d) => d.getTime()))) : null,
    };
  });
}

export type StoryProgressDetail = Awaited<ReturnType<typeof getStoriesProgress>>[number];

export async function getStoryProgress(slug: string, userId: string) {
  const [story] = await getStoriesProgress(userId, { slug });
  return story ?? null;
}

export async function getAllStoriesProgress(userId: string) {
  return getStoriesProgress(userId, {});
}
