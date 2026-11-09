import { afterEach, describe, expect, test, vi } from "vitest";
import { THEME_INIT_SCRIPT } from "@/features/theme/init-script";
import { DEFAULT_THEME, THEME_STORAGE_KEY, THEMES, parseTheme } from "@/features/theme/theme";

function runScript() {
  new Function(THEME_INIT_SCRIPT)();
}

// What the <html> attribute means after the script: no attribute is the navy default.
function appliedTheme() {
  return document.documentElement.getAttribute("data-theme") ?? DEFAULT_THEME;
}

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
});

describe("THEME_INIT_SCRIPT", () => {
  // Stays in sync with parseTheme(): same outcome for valid and invalid stored values.
  test.each([...THEMES, "Navy", " paper", "black ", "", "dark", "__proto__", "<script>"])(
    "applies the same theme as parseTheme for %j",
    (stored) => {
      localStorage.setItem(THEME_STORAGE_KEY, stored);
      runScript();
      expect(appliedTheme()).toBe(parseTheme(stored));
    },
  );

  test("leaves the default when nothing is stored", () => {
    runScript();
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
  });

  test("does not throw when localStorage throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    expect(runScript).not.toThrow();
    expect(appliedTheme()).toBe("navy");
  });

  test("reads the shared storage key", () => {
    expect(THEME_INIT_SCRIPT).toContain(`"${THEME_STORAGE_KEY}"`);
  });

  test("is a fixed string with nothing interpolated", () => {
    expect(THEME_INIT_SCRIPT).not.toMatch(/\$\{|<\/script/i);
  });
});
