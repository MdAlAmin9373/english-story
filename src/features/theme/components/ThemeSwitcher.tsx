"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
} from "react";
import {
  THEMES,
  THEME_STORAGE_KEY,
  applyTheme,
  parseTheme,
  readStoredTheme,
  saveTheme,
  type Theme,
} from "@/features/theme/theme";

const LABELS: Record<Theme, string> = { navy: "নেভি", black: "কালো", paper: "কাগজ" };

// The <html> data-theme attribute is the source of truth: the inline script sets it
// before paint, and it stays right even when localStorage is unavailable.
const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  // Another tab changed the theme (key is null when storage was cleared).
  function onStorage(event: StorageEvent) {
    if (event.key !== THEME_STORAGE_KEY && event.key !== null) return;
    applyTheme(parseTheme(event.newValue));
    onChange();
  }
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot(): Theme {
  return parseTheme(document.documentElement.getAttribute("data-theme"));
}

// null on the server and during hydration: no selected state until after mount.
function getServerSnapshot(): Theme | null {
  return null;
}

function setTheme(theme: Theme) {
  applyTheme(theme);
  saveTheme(theme);
  listeners.forEach((listener) => listener());
}

export function ThemeSwitcher() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const focusOnOpen = useRef<"checked" | "last">("checked");
  const menuId = useId();

  // React's dev Strict Mode remount clears the attribute the inline script set;
  // re-apply it before paint. A no-op in production.
  useLayoutEffect(() => {
    applyTheme(readStoredTheme());
    listeners.forEach((listener) => listener());
  }, []);

  // Move focus into the menu when it opens.
  useLayoutEffect(() => {
    if (!open) return;
    const index =
      focusOnOpen.current === "last" ? THEMES.length - 1 : Math.max(0, THEMES.indexOf(getSnapshot()));
    itemRefs.current[index]?.focus();
  }, [open]);

  // Outside click closes the menu and leaves focus where the user clicked.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  function openMenu(focus: "checked" | "last") {
    focusOnOpen.current = focus;
    setOpen(true);
  }

  function closeMenu() {
    setOpen(false);
    buttonRef.current?.focus();
  }

  function select(next: Theme) {
    setTheme(next);
    closeMenu();
  }

  function onButtonKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      openMenu(event.key === "ArrowUp" ? "last" : "checked");
    }
  }

  function onMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const items = itemRefs.current;
    const current = items.indexOf(document.activeElement as HTMLButtonElement);
    const last = THEMES.length - 1;
    let next: number | null = null;
    if (event.key === "ArrowDown") next = current >= last ? 0 : current + 1;
    else if (event.key === "ArrowUp") next = current <= 0 ? last : current - 1;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = last;
    else if (event.key === "Escape") {
      event.preventDefault();
      closeMenu();
    } else if (event.key === "Tab") {
      // Hand focus back to the button so Tab continues from there, not from <body>.
      closeMenu();
    }
    if (next !== null) {
      event.preventDefault();
      items[next]?.focus();
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label="থিম বদলান"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => (open ? setOpen(false) : openMenu("checked"))}
        onKeyDown={onButtonKeyDown}
        className="grid size-8 place-items-center rounded-lg border border-line-strong text-sm font-semibold text-ink hover:border-accent"
      >
        <span aria-hidden lang="en">
          Aa
        </span>
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label="থিম"
          onKeyDown={onMenuKeyDown}
          className="absolute right-0 top-full z-20 mt-2 w-40 max-w-[calc(100vw-2rem)] rounded-lg border border-line-strong bg-surface p-1 shadow-lg shadow-black/40"
        >
          {THEMES.map((t, i) => {
            const checked = theme === t;
            return (
              <button
                key={t}
                ref={(el) => {
                  itemRefs.current[i] = el;
                }}
                type="button"
                role="menuitemradio"
                aria-checked={checked}
                tabIndex={-1}
                onClick={() => select(t)}
                className="flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-left text-ink hover:bg-raised focus-visible:bg-raised"
              >
                {/* data-theme scopes the tokens, so the circle previews that theme's colors. */}
                <span
                  aria-hidden
                  data-theme={t}
                  className="grid size-5 shrink-0 place-items-center rounded-full border border-line-strong bg-page"
                >
                  <span className="size-2 rounded-full bg-ink" />
                </span>
                <span className="flex-1">{LABELS[t]}</span>
                <span aria-hidden className="w-4 text-accent">
                  {checked ? "✓" : ""}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
