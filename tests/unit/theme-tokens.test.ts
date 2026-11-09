// @vitest-environment node
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, test } from "vitest";
import { THEMES } from "@/features/theme/theme";

const root = join(__dirname, "..", "..");
const srcDir = join(root, "src");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(entry.name) ? [path] : [];
  });
}

const files = sourceFiles(srcDir).map((path) => ({
  name: relative(root, path).replaceAll("\\", "/"),
  text: readFileSync(path, "utf8"),
}));

// Tailwind palette colors plus the removed navy scale; shadow-black is allowed (shadows are black in every theme).
const PALETTE =
  "navy|slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";
const PALETTE_CLASS = new RegExp(
  `\\b(?:bg|text|border|ring|outline|fill|stroke|from|via|to|divide|placeholder|decoration|caret|accent|shadow)-(?:${PALETTE})-\\d{2,3}\\b|\\b(?:bg|text|border|ring|outline|fill|stroke|divide)-(?:white|black)\\b`,
  "g",
);
const HEX = /#[0-9a-fA-F]{3,8}\b/g;

describe("no hard-coded colors in src", () => {
  test.each(files.map((f) => [f.name, f.text] as const))("%s uses theme tokens only", (_name, text) => {
    expect(text.match(PALETTE_CLASS) ?? []).toEqual([]);
    expect(text.match(HEX) ?? []).toEqual([]);
  });
});

describe("theme blocks in globals.css", () => {
  const css = readFileSync(join(srcDir, "app", "globals.css"), "utf8");

  function block(theme: string): string {
    const match = css.match(new RegExp(`\\[data-theme="${theme}"\\]\\s*\\{([^}]*)\\}`));
    if (!match) throw new Error(`no block for ${theme}`);
    return match[1];
  }
  const tokens = (body: string) => [...body.matchAll(/(--[a-z-]+)\s*:/g)].map((m) => m[1]).sort();

  test("every theme defines the same tokens", () => {
    const [first, ...rest] = THEMES.map((t) => tokens(block(t)));
    expect(first.length).toBeGreaterThan(0);
    for (const other of rest) expect(other).toEqual(first);
  });

  test.each([
    ["navy", "dark"],
    ["black", "dark"],
    ["paper", "light"],
  ])("%s sets color-scheme: %s", (theme, scheme) => {
    expect(block(theme)).toMatch(new RegExp(`color-scheme:\\s*${scheme};`));
  });

  test("navy is also the :root default", () => {
    expect(css).toMatch(/:root,\s*\[data-theme="navy"\]\s*\{/);
  });
});

test("dangerouslySetInnerHTML is used only for the theme script in the root layout", () => {
  const users = files.filter((f) => /dangerouslySetInnerHTML\s*=/.test(f.text)).map((f) => f.name);
  expect(users).toEqual(["src/app/layout.tsx"]);
});
