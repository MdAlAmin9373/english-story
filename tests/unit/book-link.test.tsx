import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const router = vi.hoisted(() => ({ push: vi.fn(), prefetch: vi.fn() }));

// Partial mock: only the router hooks; redirect(), notFound() etc. stay real.
vi.mock("next/navigation", async () => ({
  ...(await vi.importActual<typeof import("next/navigation")>("next/navigation")),
  useRouter: () => router,
  usePathname: () => "/",
}));

import { COVER_OPEN_ANIMATION } from "@/features/stories/book-opener";
import { BookLink } from "@/features/stories/components/BookLink";

const HREF = "/stories/category/travel";

function stubReducedMotion(reduce: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({ matches: reduce && query.includes("reduce"), media: query })),
  );
}

function renderBook() {
  return render(
    <BookLink href={HREF} className="book">
      <span className="book-page" aria-hidden="true" />
      <span>ভ্রমণ</span> <span lang="en">Travel</span>
    </BookLink>,
  );
}

beforeEach(() => {
  router.push.mockClear();
  router.prefetch.mockClear();
  stubReducedMotion(false);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("BookLink", () => {
  test("is a real link with the same href and accessible name, closed on mount", () => {
    renderBook();
    const link = screen.getByRole("link", { name: "ভ্রমণ Travel" });
    expect(link.getAttribute("href")).toBe(HREF);
    expect(link.hasAttribute("data-opening")).toBe(false);
  });

  test("plain click opens the book and navigates once on animationend", () => {
    renderBook();
    const link = screen.getByRole("link");
    const notPrevented = fireEvent.click(link);

    expect(notPrevented).toBe(false);
    expect(link.getAttribute("data-opening")).toBe("true");
    expect(router.prefetch).toHaveBeenCalledWith(HREF);

    fireEvent.click(link); // double tap
    // jsdom has no AnimationEvent, so React listens for the prefixed webkitAnimationEnd
    // (real browsers get "animationend"); set animationName on a plain event by hand.
    const end = new Event("webkitAnimationEnd", { bubbles: true });
    Object.defineProperty(end, "animationName", { value: COVER_OPEN_ANIMATION });
    fireEvent(link, end);
    expect(router.push).toHaveBeenCalledExactlyOnceWith(HREF);
  });

  test("ctrl-click is left to the browser", () => {
    renderBook();
    const link = screen.getByRole("link");
    fireEvent.click(link, { ctrlKey: true });
    expect(link.hasAttribute("data-opening")).toBe(false);
    expect(router.push).not.toHaveBeenCalled();
  });

  test("reduced motion: no opening state and no push from BookLink", () => {
    stubReducedMotion(true);
    renderBook();
    const link = screen.getByRole("link");
    fireEvent.click(link);
    expect(link.hasAttribute("data-opening")).toBe(false);
    expect(router.push).not.toHaveBeenCalled();
  });

  test("pageshow from the bfcache closes an open book", () => {
    renderBook();
    const link = screen.getByRole("link");
    fireEvent.click(link);
    expect(link.getAttribute("data-opening")).toBe("true");

    const notPersisted = new Event("pageshow") as PageTransitionEvent;
    Object.defineProperty(notPersisted, "persisted", { value: false });
    fireEvent(window, notPersisted);
    expect(link.getAttribute("data-opening")).toBe("true");

    const persisted = new Event("pageshow") as PageTransitionEvent;
    Object.defineProperty(persisted, "persisted", { value: true });
    fireEvent(window, persisted);
    expect(link.hasAttribute("data-opening")).toBe(false);
  });

  test("remounting starts closed", () => {
    const { unmount } = renderBook();
    fireEvent.click(screen.getByRole("link"));
    expect(screen.getByRole("link").getAttribute("data-opening")).toBe("true");
    unmount();

    renderBook();
    expect(screen.getByRole("link").hasAttribute("data-opening")).toBe(false);
  });

  test("safety reset after 3000ms on the home page", () => {
    vi.useFakeTimers();
    renderBook();
    const link = screen.getByRole("link");
    fireEvent.click(link);
    act(() => vi.advanceTimersByTime(400));
    expect(router.push).toHaveBeenCalledOnce(); // fallback push; stub router never leaves "/"
    expect(link.getAttribute("data-opening")).toBe("true");
    act(() => vi.advanceTimersByTime(2600));
    expect(link.hasAttribute("data-opening")).toBe(false);
  });
});
