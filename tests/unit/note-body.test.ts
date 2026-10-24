// @vitest-environment node
import { describe, expect, test } from "vitest";
import {
  isEnglishCell,
  isHeadingRow,
  parseNoteBody,
  parseTableRow,
} from "@/features/notes/note-body";

describe("parseTableRow", () => {
  test("splits on every | and trims cells", () => {
    expect(parseTableRow("think | থিংক|ভাবা")).toEqual(["think", "থিংক", "ভাবা"]);
  });

  test('needs " | " with spaces', () => {
    expect(parseTableRow("a|b|c")).toBeNull();
  });

  test("accepts 2 to 6 cells only", () => {
    expect(parseTableRow("a | b")).toEqual(["a", "b"]);
    expect(parseTableRow("1 | 2 | 3 | 4 | 5 | 6")).toHaveLength(6);
    expect(parseTableRow("1 | 2 | 3 | 4 | 5 | 6 | 7")).toBeNull();
  });
});

describe("parseNoteBody", () => {
  test("empty or blank body gives no blocks", () => {
    expect(parseNoteBody("")).toEqual([]);
    expect(parseNoteBody("\n  \n")).toEqual([]);
  });

  test("paragraph lines stay one block with their line breaks", () => {
    expect(parseNoteBody("প্রথম লাইন\nদ্বিতীয় লাইন\n\nতৃতীয়")).toEqual([
      { type: "paragraph", text: "প্রথম লাইন\nদ্বিতীয় লাইন\n\nতৃতীয়" },
    ]);
  });

  test("consecutive pipe lines become a table without a header", () => {
    expect(parseNoteBody("think | থিংক | ভাবা\nthat | দ্যাট | ওটা")).toEqual([
      {
        type: "table",
        header: null,
        rows: [
          ["think", "থিংক", "ভাবা"],
          ["that", "দ্যাট", "ওটা"],
        ],
      },
    ]);
  });

  test("a first row of Bengali headings becomes the header", () => {
    const body =
      "শব্দ | উচ্চারণ | বাংলায় উচ্চারণ | অর্থ | সূত্র\nthink | /θɪŋk/ | থিংক | ভাবা | th = থ";
    expect(parseNoteBody(body)).toEqual([
      {
        type: "table",
        header: ["শব্দ", "উচ্চারণ", "বাংলায় উচ্চারণ", "অর্থ", "সূত্র"],
        rows: [["think", "/θɪŋk/", "থিংক", "ভাবা", "th = থ"]],
      },
    ]);
  });

  test("headings may be any subset in any order", () => {
    const [block] = parseNoteBody("অর্থ | শব্দ\nভাবা | think");
    expect(block).toEqual({ type: "table", header: ["অর্থ", "শব্দ"], rows: [["ভাবা", "think"]] });
  });

  test("a first row with other text is a normal row", () => {
    const [block] = parseNoteBody("শব্দ | মানে\nthink | ভাবা");
    expect(block).toMatchObject({ header: null, rows: [["শব্দ", "মানে"], ["think", "ভাবা"]] });
  });

  test("mixed paragraphs and tables keep their order", () => {
    expect(parseNoteBody("শুরু।\na | b\nc | d\nশেষ।")).toEqual([
      { type: "paragraph", text: "শুরু।" },
      { type: "table", header: null, rows: [["a", "b"], ["c", "d"]] },
      { type: "paragraph", text: "শেষ।" },
    ]);
  });

  test("a blank line ends a table and is not kept as a paragraph", () => {
    expect(parseNoteBody("a | b\n\nc | d")).toEqual([
      { type: "table", header: null, rows: [["a", "b"]] },
      { type: "table", header: null, rows: [["c", "d"]] },
    ]);
  });

  test("a 1-cell line stays a paragraph", () => {
    expect(parseNoteBody("শুধু একটি লাইন")).toEqual([
      { type: "paragraph", text: "শুধু একটি লাইন" },
    ]);
  });

  test("a 7-cell line stays a paragraph and ends the table", () => {
    const seven = "1 | 2 | 3 | 4 | 5 | 6 | 7";
    expect(parseNoteBody(`a | b\n${seven}`)).toEqual([
      { type: "table", header: null, rows: [["a", "b"]] },
      { type: "paragraph", text: seven },
    ]);
  });

  test("short rows are padded to the widest row", () => {
    const [block] = parseNoteBody("a | b | c\nd | e");
    expect(block).toMatchObject({ rows: [["a", "b", "c"], ["d", "e", ""]] });
  });

  test("CRLF line endings work", () => {
    expect(parseNoteBody("a | b\r\nc | d")).toHaveLength(1);
  });

  test("markup stays literal text", () => {
    expect(parseNoteBody("<b>x</b> | **y**")).toEqual([
      { type: "table", header: null, rows: [["<b>x</b>", "**y**"]] },
    ]);
  });
});

describe("isHeadingRow", () => {
  test("only the five headings count", () => {
    expect(isHeadingRow(["সূত্র", "শব্দ"])).toBe(true);
    expect(isHeadingRow(["শব্দ", ""])).toBe(false);
    expect(isHeadingRow(["শব্দ", "word"])).toBe(false);
  });
});

describe("isEnglishCell", () => {
  test("Latin text without Bengali script is English", () => {
    expect(isEnglishCell("think")).toBe(true);
    expect(isEnglishCell("/θɪŋk/")).toBe(true);
    expect(isEnglishCell("থিংক")).toBe(false);
    expect(isEnglishCell("th = থ")).toBe(false);
    expect(isEnglishCell("")).toBe(false);
    expect(isEnglishCell("১২")).toBe(false);
  });
});
