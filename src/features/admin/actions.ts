"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/features/auth/session";
import { chapterSchema, idSchema, moveSchema, statusSchema, storySchema } from "./schemas";
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
