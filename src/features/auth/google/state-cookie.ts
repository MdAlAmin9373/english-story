import "server-only";
import { z } from "zod";
import { safeNextPath } from "../next-path";

// One short-lived cookie carries everything the callback needs to check.
export const STATE_TTL_S = 10 * 60;
const CLOCK_SKEW_MS = 60 * 1000;
const MAX_COOKIE_LENGTH = 2048;

const isProduction = () => process.env.NODE_ENV === "production";

// __Host- requires Secure, Path=/ and no Domain, so it is only used over HTTPS.
export function stateCookieName(production = isProduction()): string {
  return production ? "__Host-es_google" : "es_google";
}

export function stateCookieOptions(production = isProduction()) {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: production,
    path: "/",
    maxAge: STATE_TTL_S,
  } as const;
}

const token = z.string().regex(/^[A-Za-z0-9_-]{43}$/);

const stateSchema = z.object({
  state: token,
  nonce: token,
  verifier: token,
  next: z.string().max(512),
  iat: z.number().int(), // milliseconds since epoch
});

export type GoogleState = z.infer<typeof stateSchema>;

export function encodeState(
  data: Omit<GoogleState, "iat">,
  now: number = Date.now(),
): string {
  const payload: GoogleState = { ...data, next: safeNextPath(data.next), iat: now };
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

// Returns null for anything missing, malformed or older than 10 minutes.
// The browser's maxAge is not trusted alone; the age is checked here too.
export function decodeState(raw: unknown, now: number = Date.now()): GoogleState | null {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > MAX_COOKIE_LENGTH) {
    return null;
  }
  let json: unknown;
  try {
    json = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  const parsed = stateSchema.safeParse(json);
  if (!parsed.success) return null;

  const { iat } = parsed.data;
  if (iat > now + CLOCK_SKEW_MS || now - iat > STATE_TTL_S * 1000) return null;

  return { ...parsed.data, next: safeNextPath(parsed.data.next) };
}
