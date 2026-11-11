// @vitest-environment node
import { describe, expect, test, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { STATE_TTL_S, decodeState, encodeState, stateCookieName, stateCookieOptions } =
  await import("@/features/auth/google/state-cookie");

const NOW = Date.parse("2026-11-11T10:00:00Z");
const T = (c: string) => c.repeat(43);
const data = { state: T("s"), nonce: T("n"), verifier: T("v"), next: "/stories/x/2" };

describe("encodeState / decodeState", () => {
  test("round trip", () => {
    expect(decodeState(encodeState(data, NOW), NOW)).toEqual({ ...data, iat: NOW });
  });

  test("still valid just before 10 minutes", () => {
    expect(decodeState(encodeState(data, NOW), NOW + STATE_TTL_S * 1000)).not.toBeNull();
  });

  test("older than 10 minutes → null", () => {
    expect(decodeState(encodeState(data, NOW), NOW + STATE_TTL_S * 1000 + 1)).toBeNull();
  });

  test("issued in the future (beyond 60s skew) → null", () => {
    expect(decodeState(encodeState(data, NOW + 61_000), NOW)).toBeNull();
  });

  test.each([undefined, null, 42, "", "not-base64-json", "x".repeat(3000)])(
    "garbage %#  → null",
    (raw) => expect(decodeState(raw, NOW)).toBeNull(),
  );

  test("tampered fields → null", () => {
    const tampered = Buffer.from(
      JSON.stringify({ ...data, state: "short", iat: NOW }),
    ).toString("base64url");
    expect(decodeState(tampered, NOW)).toBeNull();
  });

  test("missing field → null", () => {
    const rest: Partial<typeof data> = { ...data };
    delete rest.verifier;
    const raw = Buffer.from(JSON.stringify({ ...rest, iat: NOW })).toString("base64url");
    expect(decodeState(raw, NOW)).toBeNull();
  });

  test.each(["https://evil.com", "//evil.com", "/\\evil.com", "javascript:alert(1)"])(
    "unsafe next %s becomes /dashboard (on encode and on decode)",
    (next) => {
      expect(decodeState(encodeState({ ...data, next }, NOW), NOW)?.next).toBe("/dashboard");
      const raw = Buffer.from(JSON.stringify({ ...data, next, iat: NOW })).toString("base64url");
      expect(decodeState(raw, NOW)?.next).toBe("/dashboard");
    },
  );
});

describe("cookie name and options", () => {
  test("production: __Host- prefix and Secure", () => {
    expect(stateCookieName(true)).toBe("__Host-es_google");
    expect(stateCookieOptions(true)).toEqual({
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
      maxAge: 600,
    });
  });

  test("development: no prefix, not Secure", () => {
    expect(stateCookieName(false)).toBe("es_google");
    expect(stateCookieOptions(false).secure).toBe(false);
  });
});
