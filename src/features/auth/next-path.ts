export const DEFAULT_NEXT_PATH = "/dashboard";

const CHECK_ORIGIN = "http://local.invalid";

// Where to send the user after login. Only a same-site relative path is
// accepted; anything else falls back to /dashboard (prevents open redirects).
export function safeNextPath(value: unknown): string {
  if (typeof value !== "string" || value.length === 0 || value.length > 512) {
    return DEFAULT_NEXT_PATH;
  }
  // One leading "/", not "//" (protocol-relative URL).
  if (!value.startsWith("/") || value.startsWith("//")) return DEFAULT_NEXT_PATH;
  // No backslash (browsers treat "/\" like "//"), no "@" (userinfo), no ":" (scheme).
  if (/[\\@:]/.test(value)) return DEFAULT_NEXT_PATH;
  // No whitespace or control characters: browsers strip tabs and newlines,
  // so "/\t/evil.com" would become "//evil.com".
  if (/[\s\u0000-\u001f\u007f]/.test(value)) return DEFAULT_NEXT_PATH;

  // Final guard: the path must resolve to our own origin.
  try {
    if (new URL(value, CHECK_ORIGIN).origin !== CHECK_ORIGIN) return DEFAULT_NEXT_PATH;
  } catch {
    return DEFAULT_NEXT_PATH;
  }
  return value;
}

// Login URL that carries the next path along, e.g. /login?next=%2Fstories%2Fx%2F2.
export function loginPathWithNext(next: string): string {
  const safe = safeNextPath(next);
  return safe === DEFAULT_NEXT_PATH ? "/login" : `/login?next=${encodeURIComponent(safe)}`;
}
