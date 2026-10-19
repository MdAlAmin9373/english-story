// Pure admin validation helpers, no server imports, so they can be unit tested.

import type { TenseKind, TenseTime } from "@prisma/client";
import { tokenize } from "@/features/quiz/check";
import { tenseKinds, tenseTimes } from "@/features/vocab/tense-table";

export const GAP = "___";
export const MIN_OPTIONS = 2;
export const MAX_OPTIONS = 6;
export const MAX_OPTION_LENGTH = 120;

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// "  The Blue Kite! " → "the-blue-kite". May return "" (the schema rejects that).
export function normalizeSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// Vocabulary words are stored as a lowercase base form: "  Fly " → "fly".
export function normalizeWord(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

// Options are typed one per line in a textarea; blank lines are ignored.
export function parseOptionLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function countGaps(promptEn: string): number {
  return promptEn.split(GAP).length - 1;
}

export type QuestionDraft = {
  type: "MULTIPLE_CHOICE" | "FILL_GAP";
  promptEn: string;
  options: string[];
  correctIndex: number;
};

// Returns a Bengali error message, or null when the question is valid.
export function checkQuestion(q: QuestionDraft): string | null {
  if (q.options.length < MIN_OPTIONS || q.options.length > MAX_OPTIONS) {
    return "২ থেকে ৬টি অপশন দিন, প্রতি লাইনে একটি।";
  }
  if (q.options.some((o) => o.length > MAX_OPTION_LENGTH)) {
    return "প্রতিটি অপশন সর্বোচ্চ ১২০ অক্ষরের হতে পারে।";
  }
  const lowered = q.options.map((o) => o.toLowerCase());
  if (new Set(lowered).size !== lowered.length) {
    return "একই অপশন দুবার দেওয়া যাবে না।";
  }
  if (
    !Number.isInteger(q.correctIndex) ||
    q.correctIndex < 0 ||
    q.correctIndex >= q.options.length
  ) {
    return "সঠিক উত্তরটি অপশনগুলোর মধ্য থেকে বেছে নিন।";
  }
  if (q.type === "FILL_GAP" && countGaps(q.promptEn) !== 1) {
    return "শূন্যস্থান পূরণের প্রশ্নে ইংরেজি বাক্যে ঠিক একটি ___ থাকতে হবে।";
  }
  return null;
}

// Order for a new row appended after the existing ones (orders may have gaps).
export function nextOrder(existing: readonly number[]): number {
  return existing.length === 0 ? 1 : Math.max(...existing) + 1;
}

// The neighbouring order to swap with when moving a row up or down,
// or null when the row is already first/last or not found.
export function swapTarget(
  orders: readonly number[],
  current: number,
  direction: "up" | "down",
): number | null {
  const sorted = [...orders].sort((a, b) => a - b);
  const i = sorted.indexOf(current);
  if (i === -1) return null;
  const j = direction === "up" ? i - 1 : i + 1;
  return j >= 0 && j < sorted.length ? sorted[j] : null;
}

// ---- Tense grid (WordForm) ----

export const MAX_TENSE_FORM_LENGTH = 60;
export const MAX_TENSE_EXAMPLE_LENGTH = 300;

export const TENSE_PARTS = ["form", "exampleEn"] as const;
export type TensePart = (typeof TENSE_PARTS)[number];

// One name per grid input, shared by the form and the schema: "PRESENT.SIMPLE.form".
export function tenseFieldName(time: TenseTime, kind: TenseKind, part: TensePart): string {
  return `${time}.${kind}.${part}`;
}

export const TENSE_FIELD_NAMES: readonly string[] = tenseTimes.flatMap((time) =>
  tenseKinds.flatMap((kind) => TENSE_PARTS.map((part) => tenseFieldName(time, kind, part))),
);

function squash(value: string | undefined): string {
  return (value ?? "").trim().replace(/\s+/g, " ");
}

// Trims both inputs of a cell; null when both are empty (the cell is skipped).
export function normalizeCell(cell: {
  form?: string;
  exampleEn?: string;
}): { form: string; exampleEn: string } | null {
  const form = squash(cell.form);
  const exampleEn = squash(cell.exampleEn);
  return form || exampleEn ? { form, exampleEn } : null;
}

export type TenseGridCell = {
  time: TenseTime;
  kind: TenseKind;
  form: string;
  exampleEn: string;
};

// Filled cells to upsert, plus Bengali errors keyed by field name.
// Empty cells are skipped, never deleted.
export function checkTenseGrid(raw: Record<string, string | undefined>): {
  cells: TenseGridCell[];
  errors: Record<string, string>;
} {
  const cells: TenseGridCell[] = [];
  const errors: Record<string, string> = {};

  for (const time of tenseTimes) {
    for (const kind of tenseKinds) {
      const formName = tenseFieldName(time, kind, "form");
      const exampleName = tenseFieldName(time, kind, "exampleEn");
      const cell = normalizeCell({ form: raw[formName], exampleEn: raw[exampleName] });
      if (!cell) continue;

      const before = Object.keys(errors).length;
      if (!cell.form) errors[formName] = "রূপ ও উদাহরণ দুটোই লিখুন, নয়তো দুটোই খালি রাখুন।";
      if (!cell.exampleEn) {
        errors[exampleName] = "রূপ ও উদাহরণ দুটোই লিখুন, নয়তো দুটোই খালি রাখুন।";
      }
      if (cell.form.length > MAX_TENSE_FORM_LENGTH) {
        errors[formName] = "রূপ সর্বোচ্চ ৬০ অক্ষরের হতে পারে।";
      }
      if (cell.exampleEn.length > MAX_TENSE_EXAMPLE_LENGTH) {
        errors[exampleName] = "উদাহরণ সর্বোচ্চ ৩০০ অক্ষরের হতে পারে।";
      }
      if (Object.keys(errors).length === before) cells.push({ time, kind, ...cell });
    }
  }
  return { cells, errors };
}

// ---- Sentence-order tasks ----

export const MIN_ORDER_WORDS = 3;
export const MAX_ORDER_WORDS = 12;

// Words as the ordering game shows them (split on spaces).
export function countWords(en: string): number {
  return tokenize(en).length;
}

// Returns a Bengali error message, or null when the sentence works as a task.
export function checkOrderSentence(en: string): string | null {
  const tokens = tokenize(en);
  if (tokens.length < MIN_ORDER_WORDS || tokens.length > MAX_ORDER_WORDS) {
    return "বাক্যে ৩ থেকে ১২টি শব্দ থাকতে হবে।";
  }
  // A punctuation-only token (e.g. "—") has nothing to compare when checking the answer.
  if (tokens.some((t) => !/[\p{L}\p{N}]/u.test(t))) {
    return "প্রতিটি শব্দে অন্তত একটি অক্ষর বা সংখ্যা থাকতে হবে; আলাদা যতিচিহ্ন দেবেন না।";
  }
  return null;
}
