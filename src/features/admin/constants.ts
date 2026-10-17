import type { Genre, PublishStatus, QuestionType } from "@prisma/client";

// Enum values are listed here (not imported from @prisma/client) so client
// forms and tests stay free of server code; `satisfies` keeps them in sync.
export const GENRES = [
  "FOLKTALE",
  "ADVENTURE",
  "FAMILY",
  "FRIENDSHIP",
  "MYSTERY",
  "DAILY_LIFE",
] as const satisfies readonly Genre[];
export const STATUSES = ["DRAFT", "PUBLISHED"] as const satisfies readonly PublishStatus[];
export const QUESTION_TYPES = [
  "MULTIPLE_CHOICE",
  "FILL_GAP",
] as const satisfies readonly QuestionType[];

// Kept here, not in a "use client" file, so server components can read it too.
export const questionTypeLabel: Record<QuestionType, string> = {
  MULTIPLE_CHOICE: "বহুনির্বাচনী",
  FILL_GAP: "শূন্যস্থান পূরণ",
};
