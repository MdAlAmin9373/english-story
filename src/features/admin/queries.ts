import "server-only";
import { db } from "@/lib/db";
import { parseOptions } from "@/features/quiz/check";
import type { TenseFormInput } from "@/features/vocab/tense-table";

// Admin reads: no status filter, so drafts are included.
// Call these only after requireAdmin(), inside a <Suspense> boundary.

export async function getAdminStories() {
  return db.story.findMany({
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      slug: true,
      titleBn: true,
      titleEn: true,
      genre: true,
      level: true,
      status: true,
      _count: { select: { chapters: true } },
    },
  });
}

export async function getAdminStory(id: string) {
  return db.story.findUnique({
    where: { id },
    select: {
      id: true,
      slug: true,
      titleBn: true,
      titleEn: true,
      summaryBn: true,
      summaryEn: true,
      genre: true,
      level: true,
      status: true,
      chapters: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          order: true,
          titleBn: true,
          titleEn: true,
          requiresLogin: true,
          status: true,
        },
      },
    },
  });
}

export async function getAdminStoryTitle(id: string) {
  return db.story.findUnique({
    where: { id },
    select: { id: true, titleBn: true },
  });
}

// Scoped to the story in the URL, so a mismatched pair is treated as not found.
export async function getAdminChapter(storyId: string, chapterId: string) {
  const chapter = await db.chapter.findFirst({
    where: { id: chapterId, storyId },
    select: {
      id: true,
      order: true,
      titleBn: true,
      titleEn: true,
      requiresLogin: true,
      status: true,
      story: { select: { id: true, titleBn: true, status: true } },
      sentences: {
        orderBy: { order: "asc" },
        select: { id: true, order: true, bn: true, en: true },
      },
      words: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          order: true,
          word: true,
          meaningBn: true,
          pronunciationBn: true,
          exampleEn: true,
          exampleBn: true,
        },
      },
      quizQuestions: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          order: true,
          type: true,
          promptBn: true,
          promptEn: true,
          options: true,
          correctIndex: true,
        },
      },
      orderTasks: {
        orderBy: { order: "asc" },
        select: { id: true, order: true, promptBn: true, en: true },
      },
      notes: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          order: true,
          kind: true,
          titleBn: true,
          titleEn: true,
          bodyBn: true,
          exampleEn: true,
        },
      },
    },
  });
  if (!chapter) return null;

  // options is stored as Json; a malformed value shows as no options so the admin can fix it.
  const quizQuestions = chapter.quizQuestions.map((q) => ({
    ...q,
    options: parseOptions(q.options) ?? [],
  }));

  // Tense forms are keyed by the word string (shared across chapters): one query for all words.
  const forms =
    chapter.words.length === 0
      ? []
      : await db.wordForm.findMany({
          where: { word: { in: chapter.words.map((w) => w.word) } },
          select: { word: true, kind: true, time: true, form: true, exampleEn: true },
        });
  const formsByWord: Record<string, TenseFormInput[]> = {};
  for (const { word, ...form } of forms) {
    (formsByWord[word] ??= []).push(form);
  }

  return { ...chapter, quizQuestions, formsByWord };
}
