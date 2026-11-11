import "server-only";
import { z } from "zod";
import { emailSchema } from "../schemas";
import { safeEqual } from "./crypto";

// The ID token comes straight from Google's token endpoint over TLS, so its
// signature is not verified (OIDC Core 3.1.3.7). Every claim is still checked.
// Never pass an ID token from any other source (e.g. the browser) to this code.

export const GOOGLE_ISSUERS = ["https://accounts.google.com", "accounts.google.com"];
export const CLOCK_SKEW_S = 60;
const MAX_JWT_LENGTH = 16 * 1024;
const B64URL = /^[A-Za-z0-9_-]+$/;

// Decodes the payload part of a JWT. No signature check (see above).
export function decodeIdTokenPayload(jwt: unknown): unknown {
  if (typeof jwt !== "string" || jwt.length > MAX_JWT_LENGTH) return null;
  const parts = jwt.split(".");
  if (parts.length !== 3 || !parts.every((p) => B64URL.test(p))) return null;
  try {
    const payload: unknown = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    return payload !== null && typeof payload === "object" && !Array.isArray(payload)
      ? payload
      : null;
  } catch {
    return null;
  }
}

const claimsSchema = z.object({
  iss: z.string(),
  aud: z.union([z.string(), z.array(z.string())]),
  azp: z.string().optional(),
  sub: z.string().min(1).max(255),
  exp: z.number(),
  iat: z.number(),
  nonce: z.string().optional(),
  email: z.unknown().optional(),
  email_verified: z.unknown().optional(),
});

export type ClaimsResult =
  | { ok: true; sub: string; email: string }
  | { ok: false; code: "google_failed" | "google_unverified" };

const FAILED = { ok: false, code: "google_failed" } as const;

export function validateIdTokenClaims(
  payload: unknown,
  expected: { clientId: string; nonce: string; nowMs?: number },
): ClaimsResult {
  const parsed = claimsSchema.safeParse(payload);
  if (!parsed.success) return FAILED;
  const c = parsed.data;
  const now = (expected.nowMs ?? Date.now()) / 1000;

  if (!GOOGLE_ISSUERS.includes(c.iss)) return FAILED;

  if (typeof c.aud === "string") {
    if (c.aud !== expected.clientId) return FAILED;
  } else if (!c.aud.includes(expected.clientId) || c.azp !== expected.clientId) {
    return FAILED;
  }
  if (c.azp !== undefined && c.azp !== expected.clientId) return FAILED;

  if (!(c.exp + CLOCK_SKEW_S > now)) return FAILED;
  if (!(c.iat <= now + CLOCK_SKEW_S)) return FAILED;

  if (c.nonce === undefined || !safeEqual(c.nonce, expected.nonce)) return FAILED;

  if (c.email_verified !== true) return { ok: false, code: "google_unverified" };

  const email = emailSchema.safeParse(c.email);
  if (!email.success) return FAILED;

  return { ok: true, sub: c.sub, email: email.data };
}
