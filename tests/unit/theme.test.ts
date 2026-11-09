import { afterEach, describe, expect, test, vi } from "vitest";
import {
  DEFAULT_THEME,
  THEME_STORAGE_KEY,
  THEMES,
  applyTheme,
  parseTheme,
  readStoredTheme,
  saveTheme,
} from "@/features/theme/theme";

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
});

describe("parseTheme", () => {
  test.each(THEMES)("accepts %s", (theme) => {
    expect(parseTheme(theme)).toBe(theme);
  });

  test.each([
    ["other casing", "Navy"],
    ["upper case", "PAPER"],
    ["leading space", " navy"],
    ["trailing space", "black "],
    ["empty string", ""],
    ["unknown name", "dark"],
    ["prototype key", "__proto__"],
    ["toString key", "toString"],
    ["null", null],
    ["undefined", undefined],
    ["number", 1],
    ["array", ["paper"]],
  ])("rejects %s", (_label, value) => {
    expect(parseTheme(value)).toBe(DEFAULT_THEME);
  });

  test("defaults to navy", () => {
    expect(DEFAULT_THEME).toBe("navy");
  });
});

describe("readStoredTheme", () => {
  test("returns the stored theme", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "paper");
    expect(readStoredTheme()).toBe("paper");
  });

  test("ignores an invalid stored value", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "sepia");
    expect(readStoredTheme()).toBe("navy");
  });

  test("returns navy when nothing is stored", () => {
    expect(readStoredTheme()).toBe("navy");
  });

  test("returns navy when localStorage throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    expect(readStoredTheme()).toBe("navy");
  });
});

describe("saveTheme", () => {
  test("stores the theme under es-theme", () => {
    saveTheme("black");
    expect(localStorage.getItem("es-theme")).toBe("black");
  });

  test("does not throw when localStorage throws", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    expect(() => saveTheme("paper")).not.toThrow();
  });
});

describe("applyTheme", () => {
  test("sets data-theme for non-default themes", () => {
    applyTheme("paper");
    expect(document.documentElement.getAttribute("data-theme")).toBe("paper");
  });

  test("removes data-theme for navy", () => {
    applyTheme("black");
    applyTheme("navy");
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
  });
});
