// @vitest-environment node
import { describe, expect, test, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { decodeIdTokenPayload, validateIdTokenClaims } = await import(
  "@/features/auth/google/claims"
);

const CLIENT_ID = "123-abc.apps.googleusercontent.com";
const NONCE = "n".repeat(43);
const NOW_MS = Date.parse("2026-11-11T10:00:00Z");
const NOW = NOW_MS / 1000;

function claims(overrides: Record<string, unknown> = {}) {
  return {
    iss: "https://accounts.google.com",
    aud: CLIENT_ID,
    azp: CLIENT_ID,
    sub: "1234567890",
    email: "Learner@Example.com ",
    email_verified: true,
    iat: NOW - 10,
    exp: NOW + 3600,
    nonce: NONCE,
    ...overrides,
  };
}

const check = (payload: unknown) =>
  validateIdTokenClaims(payload, { clientId: CLIENT_ID, nonce: NONCE, nowMs: NOW_MS });

const FAILED = { ok: false, code: "google_failed" };

function jwt(payload: unknown): string {
  const enc = (v: unknown) => Buffer.from(JSON.stringify(v)).toString("base64url");
  return `${enc({ alg: "RS256" })}.${enc(payload)}.c2ln`;
}

describe("decodeIdTokenPayload", () => {
  test("decodes the payload part", () => {
    expect(decodeIdTokenPayload(jwt({ sub: "1" }))).toEqual({ sub: "1" });
  });

  test.each([undefined, 1, "", "a.b", "a.b.c.d", "a..c", "a.b+c.d", "x".repeat(17000)])(
    "bad shape %# → null",
    (v) => expect(decodeIdTokenPayload(v)).toBeNull(),
  );

  test("payload that is not a JSON object → null", () => {
    expect(decodeIdTokenPayload(jwt([1, 2]))).toBeNull();
    expect(decodeIdTokenPayload(jwt("str"))).toBeNull();
    expect(decodeIdTokenPayload("a.bm90anNvbg.c")).toBeNull();
  });
});

describe("validateIdTokenClaims", () => {
  test("valid token: sub and normalized email", () => {
    expect(check(claims())).toEqual({ ok: true, sub: "1234567890", email: "learner@example.com" });
  });

  test("issuer without https is accepted", () => {
    expect(check(claims({ iss: "accounts.google.com" })).ok).toBe(true);
  });

  test.each(["https://evil.com", "https://accounts.google.com/", ""])("wrong iss %s", (iss) => {
    expect(check(claims({ iss }))).toEqual(FAILED);
  });

  test("wrong aud", () => expect(check(claims({ aud: "other-client" }))).toEqual(FAILED));

  test("aud array with our id and matching azp is accepted", () => {
    expect(check(claims({ aud: [CLIENT_ID, "other"] })).ok).toBe(true);
  });

  test("aud array without azp", () => {
    expect(check(claims({ aud: [CLIENT_ID, "other"], azp: undefined }))).toEqual(FAILED);
  });

  test("azp for another client", () => expect(check(claims({ azp: "other" }))).toEqual(FAILED));

  test("expired token (beyond 60s skew)", () => {
    expect(check(claims({ exp: NOW - 61 }))).toEqual(FAILED);
  });

  test("exp within 60s skew is accepted", () => {
    expect(check(claims({ exp: NOW - 59 })).ok).toBe(true);
  });

  test("iat in the future (beyond 60s skew)", () => {
    expect(check(claims({ iat: NOW + 61 }))).toEqual(FAILED);
  });

  test("iat exactly 60s ahead is accepted", () => {
    expect(check(claims({ iat: NOW + 60 })).ok).toBe(true);
  });

  test("nonce mismatch", () => expect(check(claims({ nonce: "x".repeat(43) }))).toEqual(FAILED));
  test("nonce missing", () => expect(check(claims({ nonce: undefined }))).toEqual(FAILED));

  test.each([false, "true", 1, undefined])("email_verified %s → google_unverified", (v) => {
    expect(check(claims({ email_verified: v }))).toEqual({ ok: false, code: "google_unverified" });
  });

  test.each([undefined, "", "not-an-email", 5])("bad email %s", (email) => {
    expect(check(claims({ email }))).toEqual(FAILED);
  });

  test("missing sub", () => expect(check(claims({ sub: "" }))).toEqual(FAILED));
  test("non-object payload", () => expect(check(null)).toEqual(FAILED));
  test("non-numeric exp", () => expect(check(claims({ exp: "9999999999" }))).toEqual(FAILED));
});
