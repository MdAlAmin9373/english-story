"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/features/auth/session";
import {
  chapterItemMoveSchema,
  chapterSchema,
  idSchema,
  moveSchema,
  orderTaskSchema,
  questionSchema,
  sentenceSchema,
  statusSchema,
  storySchema,
  tenseGridSchema,
  wordSchema,
} from "./schemas";
import { nextOrder, swapTarget } from "./validate";

// Every action calls requireAdmin() first: the admin UI is never trusted.
// Nothing is ever deleted; stories are hidden by setting status to DRAFT.

export type AdminFormState = {
  error?: string;
  fieldErrors?: Partial<Record<string, string[]>>;
  // Submitted values, echoed back so a failed form keeps what the admin typed.
  values?: Record<string, string>;
  saved?: boolean;
};

const MSG = {
  invalid: "কিছু ঘর ঠিক নেই। নিচের ভুলগুলো দেখুন।",
  notFound: "এটি পাওয়া যায়নি। পাতাটি আবার লোড করুন।",
  slugTaken: "এই স্লাগ দিয়ে আরেকটি গল্প আছে। অন্য স্লাগ দিন।",
  orderClash: "একই সময়ে আরেকটি পরিবর্তন হয়েছে। আবার চেষ্টা করুন।",
  wordTaken: "এই শব্দটি এই অধ্যায়ে আগেই আছে।",
  failed: "সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।",
} as const;

function formValues(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, value] of formData) {
    if (typeof value === "string" && !key.startsWith("$")) values[key] = value;
  }
  return values;
}

function invalid(error: z.ZodError, values: Record<string, string>): AdminFormState {
  const { formErrors, fieldErrors } = z.flattenError(error);
  return { error: formErrors[0] ?? MSG.invalid, fieldErrors, values };
}

function prismaCode(err: unknown): string | null {
  return err instanceof Prisma.PrismaClientKnownRequestError ? err.code : null;
}

type Tx = Prisma.TransactionClient;

// Swaps a row's order with its neighbour among its siblings. Orders are unique
// per parent, so the row is parked on a temporary negative order first.
async function moveRow(
  siblings: { id: string; order: number }[],
  id: string,
  direction: "up" | "down",
  setOrder: (tx: Tx, id: string, order: number) => Promise<unknown>,
): Promise<void> {
  const row = siblings.find((s) => s.id === id);
  if (!row) return;
  const target = swapTarget(
    siblings.map((s) => s.order),
    row.order,
    direction,
  );
  const other = siblings.find((s) => s.order === target);
  if (!other) return;

  try {
    await db.$transaction(async (tx) => {
      await setOrder(tx, row.id, -1);
      await setOrder(tx, other.id, row.order);
      await setOrder(tx, row.id, other.order);
    });
  } catch (err) {
    // A concurrent move already changed the orders; the refreshed page shows the result.
    if (prismaCode(err) !== "P2002") throw err;
  }
}

export async function createStory(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin("/admin/stories/new");
  const values = formValues(formData);
  const parsed = storySchema.safeParse(values);
  if (!parsed.success) return invalid(parsed.error, values);

  let id: string;
  try {
    ({ id } = await db.story.create({ data: parsed.data, select: { id: true } }));
  } catch (err) {
    if (prismaCode(err) === "P2002") {
      return { error: MSG.slugTaken, fieldErrors: { slug: [MSG.slugTaken] }, values };
    }
    console.error("[admin] createStory failed:", (err as Error).message);
    return { error: MSG.failed, values };
  }
  redirect(`/admin/stories/${id}`);
}

export async function updateStory(
  storyId: string,
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin(`/admin/stories/${storyId}`);
  const values = formValues(formData);
  const id = idSchema.safeParse(storyId);
  if (!id.success) return { error: MSG.notFound, values };
  const parsed = storySchema.safeParse(values);
  if (!parsed.success) return invalid(parsed.error, values);

  try {
    await db.story.update({ where: { id: id.data }, data: parsed.data });
  } catch (err) {
    switch (prismaCode(err)) {
      case "P2002":
        return { error: MSG.slugTaken, fieldErrors: { slug: [MSG.slugTaken] }, values };
      case "P2025":
        return { error: MSG.notFound, values };
    }
    console.error("[admin] updateStory failed:", (err as Error).message);
    return { error: MSG.failed, values };
  }
  refresh();
  return { saved: true };
}

// Publish / unpublish from the story list (the button asks for confirmation).
export async function setStoryStatus(formData: FormData): Promise<void> {
  await requireAdmin();
  const parsed = statusSchema.safeParse(formValues(formData));
  if (!parsed.success) return;

  await db.story.updateMany({
    where: { id: parsed.data.id },
    data: { status: parsed.data.status },
  });
  refresh();
}

// New chapters are appended after the story's last chapter.
export async function createChapter(
  storyId: string,
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin(`/admin/stories/${storyId}/chapters/new`);
  const values = formValues(formData);
  const id = idSchema.safeParse(storyId);
  if (!id.success) return { error: MSG.notFound, values };
  const parsed = chapterSchema.safeParse(values);
  if (!parsed.success) return invalid(parsed.error, values);

  const story = await db.story.findUnique({
    where: { id: id.data },
    select: { id: true, chapters: { select: { order: true } } },
  });
  if (!story) return { error: MSG.notFound, values };

  let chapterId: string;
  try {
    ({ id: chapterId } = await db.chapter.create({
      data: {
        ...parsed.data,
        storyId: story.id,
        order: nextOrder(story.chapters.map((c) => c.order)),
      },
      select: { id: true },
    }));
  } catch (err) {
    if (prismaCode(err) === "P2002") return { error: MSG.orderClash, values };
    console.error("[admin] createChapter failed:", (err as Error).message);
    return { error: MSG.failed, values };
  }
  redirect(`/admin/stories/${story.id}/chapters/${chapterId}`);
}

export async function updateChapter(
  chapterId: string,
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin();
  const values = formValues(formData);
  const id = idSchema.safeParse(chapterId);
  if (!id.success) return { error: MSG.notFound, values };
  const parsed = chapterSchema.safeParse(values);
  if (!parsed.success) return invalid(parsed.error, values);

  try {
    await db.chapter.update({ where: { id: id.data }, data: parsed.data });
  } catch (err) {
    if (prismaCode(err) === "P2025") return { error: MSG.notFound, values };
    console.error("[admin] updateChapter failed:", (err as Error).message);
    return { error: MSG.failed, values };
  }
  refresh();
  return { saved: true };
}

export async function setChapterStatus(formData: FormData): Promise<void> {
  await requireAdmin();
  const parsed = statusSchema.safeParse(formValues(formData));
  if (!parsed.success) return;

  await db.chapter.updateMany({
    where: { id: parsed.data.id },
    data: { status: parsed.data.status },
  });
  refresh();
}

export async function moveChapter(formData: FormData): Promise<void> {
  await requireAdmin();
  const parsed = moveSchema.safeParse(formValues(formData));
  if (!parsed.success) return;

  const chapter = await db.chapter.findUnique({
    where: { id: parsed.data.id },
    select: { story: { select: { chapters: { select: { id: true, order: true } } } } },
  });
  if (!chapter) return;

  await moveRow(chapter.story.chapters, parsed.data.id, parsed.data.direction, (tx, id, order) =>
    tx.chapter.update({ where: { id }, data: { order } }),
  );
  refresh();
}

// Shared body of the sentence / word / question form actions: validate, write,
// and turn database errors into Bengali messages. `write` may return a state
// to stop early (e.g. a duplicate word).
async function saveItem<T>(
  schema: z.ZodType<T>,
  formData: FormData,
  write: (data: T) => Promise<AdminFormState | void>,
): Promise<AdminFormState> {
  const values = formValues(formData);
  const parsed = schema.safeParse(values);
  if (!parsed.success) return invalid(parsed.error, values);

  try {
    const stop = await write(parsed.data);
    if (stop) return { ...stop, values };
  } catch (err) {
    switch (prismaCode(err)) {
      case "P2002":
        return { error: MSG.orderClash, values };
      case "P2003": // the chapter no longer exists
      case "P2025":
        return { error: MSG.notFound, values };
    }
    console.error("[admin] saveItem failed:", (err as Error).message);
    return { error: MSG.failed, values };
  }
  refresh();
  return { saved: true };
}

// New rows are appended after the chapter's last row of that kind.
export async function createSentence(
  chapterId: string,
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin();
  const id = idSchema.safeParse(chapterId);
  if (!id.success) return { error: MSG.notFound };

  return saveItem(sentenceSchema, formData, async (data) => {
    const rows = await db.chapterSentence.findMany({
      where: { chapterId: id.data },
      select: { order: true },
    });
    await db.chapterSentence.create({
      data: { ...data, chapterId: id.data, order: nextOrder(rows.map((r) => r.order)) },
    });
  });
}

export async function updateSentence(
  sentenceId: string,
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin();
  const id = idSchema.safeParse(sentenceId);
  if (!id.success) return { error: MSG.notFound };

  return saveItem(sentenceSchema, formData, async (data) => {
    await db.chapterSentence.update({ where: { id: id.data }, data });
  });
}

// A word may appear only once per chapter (@@unique([chapterId, word])).
async function wordTaken(chapterId: string, word: string, exceptId?: string) {
  const existing = await db.vocabularyWord.findFirst({
    where: { chapterId, word, ...(exceptId && { NOT: { id: exceptId } }) },
    select: { id: true },
  });
  return existing ? { error: MSG.wordTaken, fieldErrors: { word: [MSG.wordTaken] } } : null;
}

export async function createWord(
  chapterId: string,
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin();
  const id = idSchema.safeParse(chapterId);
  if (!id.success) return { error: MSG.notFound };

  return saveItem(wordSchema, formData, async (data) => {
    const taken = await wordTaken(id.data, data.word);
    if (taken) return taken;
    const rows = await db.vocabularyWord.findMany({
      where: { chapterId: id.data },
      select: { order: true },
    });
    await db.vocabularyWord.create({
      data: { ...data, chapterId: id.data, order: nextOrder(rows.map((r) => r.order)) },
    });
  });
}

export async function updateWord(
  wordId: string,
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin();
  const id = idSchema.safeParse(wordId);
  if (!id.success) return { error: MSG.notFound };

  return saveItem(wordSchema, formData, async (data) => {
    const row = await db.vocabularyWord.findUnique({
      where: { id: id.data },
      select: { chapterId: true },
    });
    if (!row) return { error: MSG.notFound };
    const taken = await wordTaken(row.chapterId, data.word, id.data);
    if (taken) return taken;
    await db.vocabularyWord.update({ where: { id: id.data }, data });
  });
}

export async function createQuestion(
  chapterId: string,
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin();
  const id = idSchema.safeParse(chapterId);
  if (!id.success) return { error: MSG.notFound };

  return saveItem(questionSchema, formData, async (data) => {
    const rows = await db.quizQuestion.findMany({
      where: { chapterId: id.data },
      select: { order: true },
    });
    await db.quizQuestion.create({
      data: { ...data, chapterId: id.data, order: nextOrder(rows.map((r) => r.order)) },
    });
  });
}

export async function updateQuestion(
  questionId: string,
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin();
  const id = idSchema.safeParse(questionId);
  if (!id.success) return { error: MSG.notFound };

  return saveItem(questionSchema, formData, async (data) => {
    await db.quizQuestion.update({ where: { id: id.data }, data });
  });
}

// Saves the 3x3 tense grid of a vocabulary word. WordForm rows are keyed by the
// base-form word string and shared by every chapter that uses the word. The word
// is read from the database, never from the form. Empty cells are skipped, not deleted.
export async function saveWordForms(
  wordId: string,
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin();
  const id = idSchema.safeParse(wordId);
  if (!id.success) return { error: MSG.notFound };

  return saveItem(tenseGridSchema, formData, async (cells) => {
    const row = await db.vocabularyWord.findUnique({
      where: { id: id.data },
      select: { word: true },
    });
    if (!row) return { error: MSG.notFound };

    await db.$transaction(
      cells.map(({ time, kind, form, exampleEn }) =>
        db.wordForm.upsert({
          where: { word_time_kind: { word: row.word, time, kind } },
          create: { word: row.word, time, kind, form, exampleEn },
          update: { form, exampleEn },
        }),
      ),
    );
  });
}

export async function createOrderTask(
  chapterId: string,
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin();
  const id = idSchema.safeParse(chapterId);
  if (!id.success) return { error: MSG.notFound };

  return saveItem(orderTaskSchema, formData, async (data) => {
    const rows = await db.sentenceOrderTask.findMany({
      where: { chapterId: id.data },
      select: { order: true },
    });
    await db.sentenceOrderTask.create({
      data: { ...data, chapterId: id.data, order: nextOrder(rows.map((r) => r.order)) },
    });
  });
}

export async function updateOrderTask(
  taskId: string,
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin();
  const id = idSchema.safeParse(taskId);
  if (!id.success) return { error: MSG.notFound };

  return saveItem(orderTaskSchema, formData, async (data) => {
    await db.sentenceOrderTask.update({ where: { id: id.data }, data });
  });
}

// Moves a sentence, word, question or ordering task up/down within its chapter.
export async function moveChapterItem(formData: FormData): Promise<void> {
  await requireAdmin();
  const parsed = chapterItemMoveSchema.safeParse(formValues(formData));
  if (!parsed.success) return;
  const { id, kind, direction } = parsed.data;
  const siblingsOf = { select: { id: true, order: true } } as const;

  switch (kind) {
    case "sentence": {
      const row = await db.chapterSentence.findUnique({
        where: { id },
        select: { chapter: { select: { sentences: siblingsOf } } },
      });
      if (!row) return;
      await moveRow(row.chapter.sentences, id, direction, (tx, rowId, order) =>
        tx.chapterSentence.update({ where: { id: rowId }, data: { order } }),
      );
      break;
    }
    case "word": {
      const row = await db.vocabularyWord.findUnique({
        where: { id },
        select: { chapter: { select: { words: siblingsOf } } },
      });
      if (!row) return;
      await moveRow(row.chapter.words, id, direction, (tx, rowId, order) =>
        tx.vocabularyWord.update({ where: { id: rowId }, data: { order } }),
      );
      break;
    }
    case "question": {
      const row = await db.quizQuestion.findUnique({
        where: { id },
        select: { chapter: { select: { quizQuestions: siblingsOf } } },
      });
      if (!row) return;
      await moveRow(row.chapter.quizQuestions, id, direction, (tx, rowId, order) =>
        tx.quizQuestion.update({ where: { id: rowId }, data: { order } }),
      );
      break;
    }
    case "orderTask": {
      const row = await db.sentenceOrderTask.findUnique({
        where: { id },
        select: { chapter: { select: { orderTasks: siblingsOf } } },
      });
      if (!row) return;
      await moveRow(row.chapter.orderTasks, id, direction, (tx, rowId, order) =>
        tx.sentenceOrderTask.update({ where: { id: rowId }, data: { order } }),
      );
      break;
    }
  }
  refresh();
}
