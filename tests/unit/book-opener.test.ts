import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  COVER_OPEN_ANIMATION,
  OPEN_FALLBACK_MS,
  OPEN_SAFETY_RESET_MS,
  createBookOpener,
  isPlainActivation,
  type ActivationEvent,
} from "@/features/stories/book-opener";

const HREF = "/stories/category/travel";

function click(overrides: Partial<ActivationEvent> = {}) {
  return {
    button: 0,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    altKey: false,
    defaultPrevented: false,
    preventDefault: vi.fn(),
    ...overrides,
  };
}

function setup({ reducedMotion = false, onHome = true } = {}) {
  const deps = {
    push: vi.fn(),
    prefetch: vi.fn(),
    prefersReducedMotion: vi.fn(() => reducedMotion),
    isOnHome: vi.fn(() => onHome),
    setOpening: vi.fn(),
  };
  return { deps, opener: createBookOpener(deps) };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("isPlainActivation", () => {
  test("a left click with no modifiers is plain", () => {
    expect(isPlainActivation(click())).toBe(true);
  });

  test.each([
    ["ctrl", { ctrlKey: true }],
    ["meta", { metaKey: true }],
    ["shift", { shiftKey: true }],
    ["alt", { altKey: true }],
    ["middle button", { button: 1 }],
    ["right button", { button: 2 }],
    ["already prevented", { defaultPrevented: true }],
  ])("%s is not plain", (_, overrides) => {
    expect(isPlainActivation(click(overrides))).toBe(false);
  });
});

describe("createBookOpener", () => {
  test("plain click: prevented, prefetched, opens, one push after animationend", () => {
    const { deps, opener } = setup();
    const event = click();
    opener.onClick(event, HREF);

    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(deps.prefetch).toHaveBeenCalledWith(HREF);
    expect(deps.setOpening).toHaveBeenLastCalledWith(true);
    expect(deps.push).not.toHaveBeenCalled();

    opener.onAnimationEnd("some-other-animation");
    expect(deps.push).not.toHaveBeenCalled();

    opener.onAnimationEnd(COVER_OPEN_ANIMATION);
    expect(deps.push).toHaveBeenCalledExactlyOnceWith(HREF);

    vi.advanceTimersByTime(OPEN_FALLBACK_MS);
    opener.onAnimationEnd(COVER_OPEN_ANIMATION);
    expect(deps.push).toHaveBeenCalledOnce();
  });

  test("fallback timeout navigates once if animationend never fires", () => {
    const { deps, opener } = setup();
    opener.onClick(click(), HREF);

    vi.advanceTimersByTime(OPEN_FALLBACK_MS - 1);
    expect(deps.push).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(deps.push).toHaveBeenCalledExactlyOnceWith(HREF);

    opener.onAnimationEnd(COVER_OPEN_ANIMATION);
    vi.advanceTimersByTime(OPEN_FALLBACK_MS);
    expect(deps.push).toHaveBeenCalledOnce();
  });

  test.each([
    ["ctrl", { ctrlKey: true }],
    ["meta", { metaKey: true }],
    ["shift", { shiftKey: true }],
    ["alt", { altKey: true }],
    ["middle button", { button: 1 }],
  ])("%s click is left to the browser", (_, overrides) => {
    const { deps, opener } = setup();
    const event = click(overrides);
    opener.onClick(event, HREF);
    vi.advanceTimersByTime(OPEN_SAFETY_RESET_MS);

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(deps.setOpening).not.toHaveBeenCalled();
    expect(deps.push).not.toHaveBeenCalled();
  });

  test("reduced motion: not prevented, no animation, no push from us", () => {
    const { deps, opener } = setup({ reducedMotion: true });
    const event = click();
    opener.onClick(event, HREF);
    vi.advanceTimersByTime(OPEN_SAFETY_RESET_MS);

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(deps.setOpening).not.toHaveBeenCalled();
    expect(deps.push).not.toHaveBeenCalled();
  });

  test("double tap while opening navigates once and swallows the second tap", () => {
    const { deps, opener } = setup();
    opener.onClick(click(), HREF);
    const second = click();
    opener.onClick(second, HREF);

    expect(second.preventDefault).toHaveBeenCalledOnce();
    expect(deps.prefetch).toHaveBeenCalledOnce();

    opener.onAnimationEnd(COVER_OPEN_ANIMATION);
    vi.advanceTimersByTime(OPEN_FALLBACK_MS);
    expect(deps.push).toHaveBeenCalledOnce();
  });

  test("reset closes the book and cancels the pending navigation", () => {
    const { deps, opener } = setup();
    opener.onClick(click(), HREF);
    opener.reset();

    expect(deps.setOpening).toHaveBeenLastCalledWith(false);
    expect(opener.isOpening()).toBe(false);
    vi.advanceTimersByTime(OPEN_SAFETY_RESET_MS);
    opener.onAnimationEnd(COVER_OPEN_ANIMATION);
    expect(deps.push).not.toHaveBeenCalled();
  });

  test("dispose clears timers without touching React state", () => {
    const { deps, opener } = setup();
    opener.onClick(click(), HREF);
    deps.setOpening.mockClear();
    opener.dispose();

    vi.advanceTimersByTime(OPEN_SAFETY_RESET_MS);
    expect(deps.push).not.toHaveBeenCalled();
    expect(deps.setOpening).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  test("safety reset: still on the home page after 3000ms closes the book", () => {
    const { deps, opener } = setup({ onHome: true });
    opener.onClick(click(), HREF);
    vi.advanceTimersByTime(OPEN_FALLBACK_MS); // push happened but navigation stalled

    vi.advanceTimersByTime(OPEN_SAFETY_RESET_MS - OPEN_FALLBACK_MS - 1);
    expect(opener.isOpening()).toBe(true);
    vi.advanceTimersByTime(1);
    expect(opener.isOpening()).toBe(false);
    expect(deps.setOpening).toHaveBeenLastCalledWith(false);

    // A new tap works again afterwards.
    opener.onClick(click(), HREF);
    expect(deps.setOpening).toHaveBeenLastCalledWith(true);
  });

  test("safety reset does nothing once we have left the home page", () => {
    const { deps, opener } = setup({ onHome: false });
    opener.onClick(click(), HREF);
    vi.advanceTimersByTime(OPEN_SAFETY_RESET_MS);

    expect(opener.isOpening()).toBe(true);
    expect(deps.setOpening).toHaveBeenLastCalledWith(true);
  });
});
