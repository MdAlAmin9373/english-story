// Pure admin validation helpers, no server imports, so they can be unit tested.

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
