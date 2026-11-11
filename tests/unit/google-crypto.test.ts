// @vitest-environment node
import { describe, expect, test, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { createPkce, pkceChallenge, randomToken, safeEqual } = await import(
  "@/features/auth/google/crypto"
);

describe("PKCE", () => {
  test("S256 challenge matches the RFC 7636 Appendix B vector", () => {
    expect(pkceChallenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk")).toBe(
      "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
    );
  });

  test("createPkce returns a 43-char verifier and its challenge", () => {
    const { verifier, challenge } = createPkce();
    expect(verifier).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(challenge).toBe(pkceChallenge(verifier));
  });
});

describe("randomToken", () => {
  test("is 43 base64url chars (32 bytes) and unique", () => {
    const tokens = new Set(Array.from({ length: 100 }, randomToken));
    expect(tokens.size).toBe(100);
    for (const t of tokens) expect(t).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });
});

describe("safeEqual", () => {
  test("equal strings", () => expect(safeEqual("abc", "abc")).toBe(true));
  test("different strings of the same length", () => expect(safeEqual("abc", "abd")).toBe(false));
  test("different lengths do not throw", () => {
    expect(safeEqual("abc", "abcd")).toBe(false);
    expect(safeEqual("", "a")).toBe(false);
  });
});
