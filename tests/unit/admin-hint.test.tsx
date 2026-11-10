import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import { HintField } from "@/features/admin/components/HintField";
import { orderTaskSchema, questionSchema } from "@/features/admin/schemas";
import { MAX_HINT_LENGTH, normalizeHint } from "@/features/admin/validate";
import { HintBox } from "@/features/quiz/components/HintBox";

afterEach(cleanup);

describe("normalizeHint", () => {
  test("trims and keeps inner line breaks", () => {
    expect(normalizeHint("  প্রথম লাইন\nsecond line  ")).toBe("প্রথম লাইন\nsecond line");
  });
  test("turns \\r\\n and \\r into \\n", () => {
    expect(normalizeHint("a\r\nb\rc")).toBe("a\nb\nc");
  });
  test("empty, whitespace-only or missing means no hint", () => {
    expect(normalizeHint("")).toBeNull();
    expect(normalizeHint(" \n\t \r\n ")).toBeNull();
    expect(normalizeHint(undefined)).toBeNull();
  });
});

const question = {
  type: "MULTIPLE_CHOICE",
  promptBn: "রাতুল কোথায় থাকে?",
  promptEn: "Where does Ratul live?",
  options: "In a city\nIn a village",
  correctIndex: "1",
};
const task = { promptBn: "তার নাম মিতু।", en: "Her name is Mitu." };

// Both schemas share the same hint rule.
describe.each([
  ["questionSchema", questionSchema, question],
  ["orderTaskSchema", orderTaskSchema, task],
] as const)("%s hint", (_name, schema, base) => {
  const parse = (hint?: string) =>
    schema.safeParse(hint === undefined ? base : { ...base, hint });

  test("stores a trimmed hint, Bengali and English mixed", () => {
    const r = parse("  গ্রামের কথা ভাবুন — think of the first sentence. ");
    expect(r.success && r.data.hint).toBe("গ্রামের কথা ভাবুন — think of the first sentence.");
  });

  test("empty or whitespace-only becomes null (clearing removes the hint)", () => {
    for (const hint of ["", "   ", "\r\n \n"]) {
      const r = parse(hint);
      expect(r.success).toBe(true);
      expect(r.success && r.data.hint).toBeNull();
    }
  });

  test("a missing field is null too", () => {
    const r = parse();
    expect(r.success && r.data.hint).toBeNull();
  });

  test("exactly 400 characters pass, 401 fail on the hint field", () => {
    expect(parse("ক".repeat(MAX_HINT_LENGTH)).success).toBe(true);
    const r = parse("ক".repeat(MAX_HINT_LENGTH + 1));
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues[0].path).toEqual(["hint"]);
      expect(r.error.issues[0].message).toMatch(/৪০০/);
    }
  });

  test("400 characters with \\r\\n line breaks still pass (a break counts as one)", () => {
    const lines = ["a".repeat(100), "b".repeat(100), "c".repeat(100), "d".repeat(97)];
    const hint = lines.join("\r\n"); // 403 raw; 397 + 3 breaks = 400 once normalized
    expect(hint.length).toBe(403);
    const r = parse(hint);
    expect(r.success && r.data.hint).toBe(lines.join("\n"));
  });

  test("surrounding spaces do not count towards the limit", () => {
    expect(parse(`  ${"a".repeat(MAX_HINT_LENGTH)}  `).success).toBe(true);
  });
});

describe("HintField", () => {
  function renderField(defaultValue = "") {
    render(
      <form>
        <HintField id="h" defaultValue={defaultValue} />
      </form>,
    );
    return screen.getByLabelText("ইঙ্গিত (ঐচ্ছিক)") as HTMLTextAreaElement;
  }

  test("label, name, limit and the counter for an existing hint", () => {
    const input = renderField("মিতু");
    expect(input.name).toBe("hint");
    expect(input.maxLength).toBe(MAX_HINT_LENGTH);
    expect(input.getAttribute("aria-describedby")).toBe("h-count");
    expect(document.getElementById("h-count")?.textContent).toBe("৪/৪০০ অক্ষর");
  });

  test("the counter follows typing and ignores surrounding spaces", () => {
    const input = renderField();
    expect(screen.getByText("০/৪০০ অক্ষর")).toBeDefined();
    fireEvent.change(input, { target: { value: "  ab\ncd  " } });
    expect(screen.getByText("৫/৪০০ অক্ষর")).toBeDefined();
    fireEvent.change(input, { target: { value: "" } });
    expect(screen.getByText("০/৪০০ অক্ষর")).toBeDefined();
  });
});

describe("HintBox", () => {
  test("plain text in a note, line breaks kept, no HTML", () => {
    render(<HintBox hint={"প্রথম লাইন\n<b>not bold</b>"} />);
    const note = screen.getByRole("note", { name: "ইঙ্গিত" });
    expect(note.textContent).toContain("প্রথম লাইন\n<b>not bold</b>");
    expect(note.querySelector("b")).toBeNull();
    expect(note.querySelector(".whitespace-pre-line")).not.toBeNull();
  });
});
