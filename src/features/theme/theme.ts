// Reading themes. The choice lives only in localStorage (never a cookie),
// so the root layout stays static under Cache Components.
export const THEMES = ["navy", "black", "paper"] as const;
export type Theme = (typeof THEMES)[number];

export const DEFAULT_THEME: Theme = "navy";
export const THEME_STORAGE_KEY = "es-theme";

// Exact match only: anything else (other casing, whitespace, old values) falls back to the default.
export function parseTheme(value: unknown): Theme {
  return typeof value === "string" && (THEMES as readonly string[]).includes(value)
    ? (value as Theme)
    : DEFAULT_THEME;
}

// localStorage can throw (private mode, blocked site data), so every access is guarded.
export function readStoredTheme(): Theme {
  try {
    return parseTheme(window.localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return DEFAULT_THEME;
  }
}

export function saveTheme(theme: Theme): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Not persisted; the theme still applies for this page view.
  }
}

// Navy is the :root default in globals.css, so it needs no attribute.
export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  if (theme === DEFAULT_THEME) root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
}
