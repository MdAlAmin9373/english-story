// @vitest-environment node
import { describe, expect, test } from "vitest";
import { canReadChapter } from "@/features/stories/access";

const free = { requiresLogin: false };
const locked = { requiresLogin: true };

describe("canReadChapter", () => {
  test("guests may read free chapters", () => {
    expect(canReadChapter(free, false)).toBe(true);
  });

  test("guests may not read chapters that need login", () => {
    expect(canReadChapter(locked, false)).toBe(false);
  });

  test("logged-in users may read free chapters", () => {
    expect(canReadChapter(free, true)).toBe(true);
  });

  test("logged-in users may read chapters that need login", () => {
    expect(canReadChapter(locked, true)).toBe(true);
  });
});
