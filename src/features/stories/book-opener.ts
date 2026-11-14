// Click logic for the home shelf's "open the book" animation (see components/BookLink.tsx).
// Framework-free so it can be unit-tested: the React component injects the router,
// media query, location check and timers.

export const COVER_OPEN_ANIMATION = "book-cover-open";
/** Navigate even if animationend never fires (e.g. animation skipped or interrupted). */
export const OPEN_FALLBACK_MS = 400;
/** If navigation stalls and we are still on the home page, close the book again. */
export const OPEN_SAFETY_RESET_MS = 3000;

export type ActivationEvent = {
  button: number;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  defaultPrevented: boolean;
  preventDefault: () => void;
};

type TimerId = ReturnType<typeof setTimeout>;

export type BookOpenerDeps = {
  push: (href: string) => void;
  prefetch: (href: string) => void;
  prefersReducedMotion: () => boolean;
  isOnHome: () => boolean;
  setOpening: (opening: boolean) => void;
  setTimer?: (fn: () => void, ms: number) => TimerId;
  clearTimer?: (id: TimerId) => void;
};

export function isPlainActivation(event: ActivationEvent): boolean {
  return (
    event.button === 0 &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.shiftKey &&
    !event.altKey &&
    !event.defaultPrevented
  );
}

export function createBookOpener(deps: BookOpenerDeps) {
  const setTimer = deps.setTimer ?? ((fn, ms) => setTimeout(fn, ms));
  const clearTimer = deps.clearTimer ?? ((id) => clearTimeout(id));

  let opening = false;
  let target: string | null = null;
  let fallback: TimerId | null = null;
  let safety: TimerId | null = null;

  function clearTimers() {
    if (fallback !== null) clearTimer(fallback);
    if (safety !== null) clearTimer(safety);
    fallback = null;
    safety = null;
  }

  // Navigate at most once per opening; later calls (fallback after animationend,
  // or the reverse) are no-ops because target is cleared.
  function navigate() {
    if (target === null) return;
    const href = target;
    target = null;
    if (fallback !== null) clearTimer(fallback);
    fallback = null;
    deps.push(href);
  }

  function reset() {
    clearTimers();
    opening = false;
    target = null;
    deps.setOpening(false);
  }

  return {
    onClick(event: ActivationEvent, href: string) {
      if (opening) {
        // A second tap while the cover swings: swallow it so we navigate only once.
        if (isPlainActivation(event)) event.preventDefault();
        return;
      }
      if (!isPlainActivation(event)) return; // new tab, download, etc.: browser default
      if (deps.prefersReducedMotion()) return; // let next/link navigate normally

      event.preventDefault();
      deps.prefetch(href);
      opening = true;
      target = href;
      deps.setOpening(true);
      fallback = setTimer(navigate, OPEN_FALLBACK_MS);
      safety = setTimer(() => {
        safety = null;
        if (deps.isOnHome()) reset();
      }, OPEN_SAFETY_RESET_MS);
    },
    onAnimationEnd(animationName: string) {
      if (opening && animationName === COVER_OPEN_ANIMATION) navigate();
    },
    reset,
    /** Clear timers without touching React state (for unmount). */
    dispose() {
      clearTimers();
      opening = false;
      target = null;
    },
    isOpening: () => opening,
  };
}

export type BookOpener = ReturnType<typeof createBookOpener>;
