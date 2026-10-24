// @vitest-environment node
import { describe, expect, test } from "vitest";
import { chapterItemMoveSchema, noteSchema } from "@/features/admin/schemas";
import {
  MAX_NOTE_BODY_LENGTH,
  MAX_NOTE_EXAMPLE_LENGTH,
  MAX_NOTE_TITLE_LENGTH,
  normalizeNoteBody,
} from "@/features/admin/validate";

const validNote = {
  kind: "PRONUNCIATION",
  titleBn: "th-এর উচ্চারণ",
  titleEn: "Saying th",
  bodyBn: "জিভের ডগা দাঁতের মাঝে রেখে বাতাস ছাড়ুন।",
  exampleEn: "I think the kite is there.",
};

describe("normalizeNoteBody", () => {
  test("trims lines and squashes repeated spaces", () => {
    expect(normalizeNoteBody("  এক   লাইন  \n\t দুই\tলাইন ")).toBe("এক লাইন\nদুই লাইন");
  });

  test("turns CRLF and CR into LF", () => {
    expect(normalizeNoteBody("a\r\nb\rc")).toBe("a\nb\nc");
  });

  test("keeps at most one blank line between paragraphs", () => {
    expect(normalizeNoteBody("a\n\n\n\nb\n \n\t\nc")).toBe("a\n\nb\n\nc");
  });

  test("drops blank lines at the start and end", () => {
    expect(normalizeNoteBody("\n\n  a  \n\n")).toBe("a");
    expect(normalizeNoteBody(" \n \r\n ")).toBe("");
  });
});

describe("noteSchema", () => {
  test("accepts a valid note and trims fields", () => {
    const parsed = noteSchema.parse({
      ...validNote,
      kind: "GRAMMAR",
      titleBn: "  শিরোনাম  ",
      bodyBn: "প্রথম লাইন\r\n\r\n\r\nদ্বিতীয় লাইন",
    });
    expect(parsed.kind).toBe("GRAMMAR");
    expect(parsed.titleBn).toBe("শিরোনাম");
    expect(parsed.bodyBn).toBe("প্রথম লাইন\n\nদ্বিতীয় লাইন");
  });

  test("requires a known kind", () => {
    expect(noteSchema.safeParse({ ...validNote, kind: undefined }).success).toBe(false);
    expect(noteSchema.safeParse({ ...validNote, kind: "SPELLING" }).success).toBe(false);
    expect(noteSchema.safeParse({ ...validNote, kind: "" }).success).toBe(false);
  });

  test("requires every text field", () => {
    for (const field of ["titleBn", "titleEn", "bodyBn", "exampleEn"] as const) {
      expect(noteSchema.safeParse({ ...validNote, [field]: "   " }).success).toBe(false);
      expect(noteSchema.safeParse({ ...validNote, [field]: undefined }).success).toBe(false);
    }
  });

  test("title limit is 120 characters", () => {
    const at = "ক".repeat(MAX_NOTE_TITLE_LENGTH);
    expect(MAX_NOTE_TITLE_LENGTH).toBe(120);
    expect(noteSchema.safeParse({ ...validNote, titleBn: at, titleEn: at }).success).toBe(true);
    expect(noteSchema.safeParse({ ...validNote, titleBn: `${at}ক` }).success).toBe(false);
    expect(noteSchema.safeParse({ ...validNote, titleEn: `${at}a` }).success).toBe(false);
  });

  test("body limit is 1500 characters, counted after normalizing", () => {
    const at = "ক".repeat(MAX_NOTE_BODY_LENGTH);
    expect(MAX_NOTE_BODY_LENGTH).toBe(1500);
    expect(noteSchema.safeParse({ ...validNote, bodyBn: at }).success).toBe(true);
    expect(noteSchema.safeParse({ ...validNote, bodyBn: `${at}ক` }).success).toBe(false);
    expect(noteSchema.safeParse({ ...validNote, bodyBn: `\n\n  ${at}  \n\n` }).success).toBe(true);
  });

  test("example limit is 300 characters", () => {
    const at = "a".repeat(MAX_NOTE_EXAMPLE_LENGTH);
    expect(MAX_NOTE_EXAMPLE_LENGTH).toBe(300);
    expect(noteSchema.safeParse({ ...validNote, exampleEn: at }).success).toBe(true);
    expect(noteSchema.safeParse({ ...validNote, exampleEn: `${at}a` }).success).toBe(false);
  });
});

describe("chapterItemMoveSchema", () => {
  test("accepts notes", () => {
    expect(
      chapterItemMoveSchema.safeParse({ id: "abc", kind: "note", direction: "up" }).success,
    ).toBe(true);
  });
});
