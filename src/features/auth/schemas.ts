import { z } from "zod";

const BENGALI_DIGITS = "০১২৩৪৫৬৭৮৯";

// Users may type the code with a Bengali keyboard.
function toAsciiDigits(value: string): string {
  return value.replace(/[০-৯]/g, (d) => String(BENGALI_DIGITS.indexOf(d)));
}

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, "ইমেইল ঠিকানাটি অনেক লম্বা।")
  .pipe(z.email("সঠিক ইমেইল ঠিকানা লিখুন।"));

export const codeSchema = z
  .string()
  .transform((v) => toAsciiDigits(v.replace(/\s/g, "")))
  .pipe(z.string().regex(/^\d{6}$/, "৬ সংখ্যার কোডটি লিখুন।"));
