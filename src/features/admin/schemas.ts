import { z } from "zod";
import { toBnDigits } from "@/features/stories/labels";
import { GENRES, QUESTION_TYPES, STATUSES } from "./constants";
import {
  SLUG_PATTERN,
  checkQuestion,
  normalizeSlug,
  normalizeWord,
  parseOptionLines,
} from "./validate";

const text = (max: number) =>
  z
    .string("এই ঘরটি পূরণ করুন।")
    .trim()
    .min(1, "এই ঘরটি পূরণ করুন।")
    .max(max, `সর্বোচ্চ ${toBnDigits(max)} অক্ষর লেখা যাবে।`);

export const idSchema = z.string().min(1).max(64);

// An unchecked checkbox is absent from FormData.
const checkbox = z
  .string()
  .optional()
  .transform((v) => v === "on");

export const storySchema = z.object({
  slug: z
    .string("স্লাগ লিখুন।")
    .transform(normalizeSlug)
    .pipe(
      z
        .string()
        .min(1, "স্লাগ লিখুন (ইংরেজি অক্ষর, সংখ্যা ও হাইফেন)।")
        .max(80, "স্লাগ সর্বোচ্চ ৮০ অক্ষরের হতে পারে।")
        .regex(SLUG_PATTERN, "স্লাগে শুধু ইংরেজি ছোট হাতের অক্ষর, সংখ্যা ও হাইফেন চলবে।"),
    ),
  titleBn: text(120),
  titleEn: text(120),
  summaryBn: text(1000),
  summaryEn: text(1000),
  genre: z.enum(GENRES, "ধরন বেছে নিন।"),
  level: z.coerce
    .number("স্তর বেছে নিন।")
    .int("স্তর বেছে নিন।")
    .min(1, "স্তর ১ থেকে ৫ হতে পারে।")
    .max(5, "স্তর ১ থেকে ৫ হতে পারে।"),
  status: z.enum(STATUSES, "অবস্থা বেছে নিন।"),
});

export const chapterSchema = z.object({
  titleBn: text(120),
  titleEn: text(120),
  requiresLogin: checkbox,
  status: z.enum(STATUSES, "অবস্থা বেছে নিন।"),
});

export const sentenceSchema = z.object({
  bn: text(500),
  en: text(500),
});

export const wordSchema = z.object({
  word: text(60).transform(normalizeWord),
  meaningBn: text(120),
  pronunciationBn: text(60),
  exampleEn: text(300),
  exampleBn: text(300),
});

export const questionSchema = z
  .object({
    type: z.enum(QUESTION_TYPES, "প্রশ্নের ধরন বেছে নিন।"),
    promptBn: text(300),
    promptEn: text(300),
    options: z.string("অপশন লিখুন।").max(1000).transform(parseOptionLines),
    correctIndex: z.coerce.number("সঠিক উত্তর বেছে নিন।").int(),
  })
  .superRefine((q, ctx) => {
    const error = checkQuestion(q);
    if (error) ctx.addIssue({ code: "custom", message: error });
  });

export const statusSchema = z.object({
  id: idSchema,
  status: z.enum(STATUSES),
});

export const moveSchema = z.object({
  id: idSchema,
  direction: z.enum(["up", "down"]),
});

// Rows inside a chapter that the editors can reorder.
export const CHAPTER_ITEM_KINDS = ["sentence", "word", "question"] as const;
export type ChapterItemKind = (typeof CHAPTER_ITEM_KINDS)[number];

export const chapterItemMoveSchema = moveSchema.extend({
  kind: z.enum(CHAPTER_ITEM_KINDS),
});
