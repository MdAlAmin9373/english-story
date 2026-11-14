import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

afterEach(() => {
  cleanup();
});

vi.mock("server-only", () => ({}));
// BookLink needs an app router; keep the rest of next/navigation real.
vi.mock("next/navigation", async () => ({
  ...(await vi.importActual<typeof import("next/navigation")>("next/navigation")),
  useRouter: () => ({ push: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/",
}));
vi.mock("@/features/stories/queries", () => ({
  getPublishedCategoryCounts: vi.fn(() => new Promise(() => {})), // stays on the fallback
}));

import Home from "@/app/page";
import { CATEGORIES, type CategoryCounts } from "@/features/stories/categories";
import { Bookshelf } from "@/features/stories/components/Bookshelf";

describe("home page", () => {
  test("shows the Bengali heading, the English line and the subtext", () => {
    render(<Home />);
    expect(
      screen.getByRole("heading", { level: 1, name: "গল্পের তাক থেকে একটি বই বেছে নিন" }),
    ).toBeDefined();
    expect(screen.getByText("Learn English by stories")).toBeDefined();
    expect(
      screen.getByText("ছোট ছোট গল্প পড়ুন, কুইজ খেলুন — খুব সহজেই ইংরেজি শিখুন।"),
    ).toBeDefined();
  });
});

describe("Bookshelf", () => {
  const counts: CategoryCounts = {
    DAILY_LIFE: 3,
    MYSTERY_ADVENTURE: 0,
    FUNNY: 1,
    WORK_CAREER: 0,
    TRAVEL: 12,
    FABLES: 0,
  };

  test("renders one link per category, pointing at its category page", () => {
    render(<Bookshelf counts={counts} />);
    const shelf = screen.getByRole("list", { name: "গল্পের বিভাগ" });
    const links = within(shelf).getAllByRole("link");
    expect(links).toHaveLength(6);
    expect(links.map((a) => a.getAttribute("href"))).toEqual(
      CATEGORIES.map((c) => `/stories/category/${c.slug}`),
    );
  });

  test("each slot carries its stagger index for the mobile entrance animation", () => {
    render(<Bookshelf counts={counts} />);
    const shelf = screen.getByRole("list", { name: "গল্পের বিভাগ" });
    const slots = within(shelf).getAllByRole("listitem");
    expect(slots.map((li) => li.style.getPropertyValue("--slot-index"))).toEqual(
      CATEGORIES.map((_, i) => String(i)),
    );
  });

  test("each link has readable text: Bengali name, English name and story count", () => {
    render(<Bookshelf counts={counts} />);
    expect(
      screen.getByRole("link", { name: "দৈনন্দিন জীবন Daily Life ৩টি গল্প" }),
    ).toBeDefined();
    expect(screen.getByRole("link", { name: "ভ্রমণ Travel ১২টি গল্প" })).toBeDefined();
  });

  test("an empty category says 'coming soon' and is still a link", () => {
    render(<Bookshelf counts={counts} />);
    const link = screen.getByRole("link", { name: "উপকথা ও নীতিকথা Fables শীঘ্রই আসছে" });
    expect(link.getAttribute("href")).toBe("/stories/category/fables");
    expect(screen.getAllByText("শীঘ্রই আসছে")).toHaveLength(3);
  });
});
