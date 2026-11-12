import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { cleanup, render, screen, within } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, test, vi } from "vitest";

// The login options pull in server actions; the line under them is what is tested here.
vi.mock("@/features/auth/components/LoginOptions", () => ({
  LoginOptions: () => <div>LOGIN_OPTIONS</div>,
}));

const { default: PrivacyPage, metadata: privacyMeta } = await import("@/app/privacy/page");
const { default: TermsPage, metadata: termsMeta } = await import("@/app/terms/page");
const { default: LoginPage } = await import("@/app/login/page");
const { SiteFooter } = await import("@/components/SiteFooter");
const { LEGAL_UPDATED, PRIVACY, SUPPORT_EMAIL, TERMS } = await import("@/features/legal/content");
type LegalDoc = typeof PRIVACY;

afterEach(cleanup);

const pages: Array<[string, () => React.ReactNode, LegalDoc]> = [
  ["privacy", PrivacyPage, PRIVACY],
  ["terms", TermsPage, TERMS],
];

describe.each(pages)("/%s", (_name, Page, doc) => {
  test("renders without login, with the h1, date and support email", () => {
    render(<Page />);
    expect(screen.getByRole("heading", { level: 1, name: doc.heading })).toBeDefined();
    expect(screen.getByText(`সর্বশেষ হালনাগাদ: ${LEGAL_UPDATED}`)).toBeDefined();
    const mailLinks = screen
      .getAllByRole("link", { name: SUPPORT_EMAIL })
      .map((a) => a.getAttribute("href"));
    expect(mailLinks.length).toBeGreaterThan(0);
    expect(new Set(mailLinks)).toEqual(new Set([`mailto:${SUPPORT_EMAIL}`]));
  });

  test("every heading in the content file is rendered", () => {
    render(<Page />);
    for (const section of doc.sections) {
      expect(screen.getByRole("heading", { level: 2, name: section.title })).toBeDefined();
      for (const block of section.blocks) {
        if ("h3" in block) {
          expect(screen.getByRole("heading", { level: 3, name: block.h3 })).toBeDefined();
        }
      }
    }
  });

  test("the table of contents links to every section", () => {
    render(<Page />);
    const toc = within(screen.getByRole("navigation", { name: "সূচিপত্র" }));
    for (const section of doc.sections) {
      expect(toc.getByRole("link", { name: section.title }).getAttribute("href")).toBe(`#${section.id}`);
      expect(document.getElementById(section.id)).not.toBeNull();
    }
  });

  test("section ids are unique", () => {
    const ids = doc.sections.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("the browser title", () => {
    expect(doc.metaTitle).toBe(`${doc.heading} — English Story`);
  });
});

test("page metadata uses the content titles", () => {
  expect(privacyMeta.title).toBe("গোপনীয়তা নীতি — English Story");
  expect(termsMeta.title).toBe("শর্তাবলী — English Story");
});

test("privacy names Gmail for support email but no Gmail address", () => {
  const text = JSON.stringify(PRIVACY);
  expect(text).toContain("Gmail");
  expect(text).not.toMatch(/@gmail\.com/i);
  expect(text).not.toMatch(/Resend/i);
});

test("footer shows copyright, both legal links and the support email", () => {
  render(<SiteFooter />);
  const footer = within(screen.getByRole("contentinfo"));
  expect(footer.getByText("© ২০২৬ English Story")).toBeDefined();
  expect(footer.getByRole("link", { name: "গোপনীয়তা নীতি" }).getAttribute("href")).toBe("/privacy");
  expect(footer.getByRole("link", { name: "শর্তাবলী" }).getAttribute("href")).toBe("/terms");
  expect(footer.getByRole("link", { name: SUPPORT_EMAIL }).getAttribute("href")).toBe(
    `mailto:${SUPPORT_EMAIL}`,
  );
});

test("root layout renders the footer on every page", () => {
  const layout = readFileSync(join(__dirname, "..", "..", "src", "app", "layout.tsx"), "utf8");
  expect(layout).toMatch(/<SiteFooter\s*\/>/);
});

test("login page shows the consent line with both links outside Suspense", () => {
  // The panel behind Suspense never resolves here, so only the static shell renders.
  const html = renderToString(
    <LoginPage params={Promise.resolve({})} searchParams={new Promise(() => {})} />,
  );
  expect(html).toContain("লোড হচ্ছে…"); // Suspense fallback
  expect(html).not.toContain("LOGIN_OPTIONS");

  document.body.innerHTML = html;
  const line = screen.getByText((_, el) => el?.tagName === "P" && /মেনে নিচ্ছেন।$/.test(el.textContent ?? ""));
  expect(line.textContent).toBe("লগইন করে আপনি আমাদের শর্তাবলী ও গোপনীয়তা নীতি মেনে নিচ্ছেন।");
  expect(within(line).getByRole("link", { name: "শর্তাবলী" }).getAttribute("href")).toBe("/terms");
  expect(within(line).getByRole("link", { name: "গোপনীয়তা নীতি" }).getAttribute("href")).toBe("/privacy");
});

test("dangerouslySetInnerHTML is used only for the theme script", () => {
  const root = join(__dirname, "..", "..");
  const walk = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory() ? walk(join(dir, e.name)) : /\.(ts|tsx)$/.test(e.name) ? [join(dir, e.name)] : [],
    );
  const users = walk(join(root, "src"))
    .filter((f) => /dangerouslySetInnerHTML\s*=/.test(readFileSync(f, "utf8")))
    .map((f) => relative(root, f).replaceAll("\\", "/"));
  expect(users).toEqual(["src/app/layout.tsx"]);
  expect(readFileSync(join(root, "src", "app", "layout.tsx"), "utf8")).toMatch(
    /dangerouslySetInnerHTML=\{\{ __html: THEME_INIT_SCRIPT \}\}/,
  );
});
