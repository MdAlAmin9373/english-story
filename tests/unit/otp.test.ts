// @vitest-environment node
import { describe, expect, test } from "vitest";
import {
  OTP_MAX_ATTEMPTS,
  OTP_TTL_MS,
  checkOtp,
  generateCode,
  hashCode,
  normalizeEmail,
  otpExpiry,
  type OtpRecord,
} from "@/features/auth/otp";
import { codeSchema, emailSchema } from "@/features/auth/schemas";

const PEPPER = "test-pepper-that-is-at-least-32-characters";
const EMAIL = "learner@example.com";
const CODE = "123456";
const NOW = new Date("2026-10-16T10:00:00Z");

function record(overrides: Partial<OtpRecord> = {}): OtpRecord {
  return {
    codeHash: hashCode(EMAIL, CODE, PEPPER),
    expiresAt: otpExpiry(NOW),
    used: false,
    attempts: 1, // the current attempt, already incremented
    ...overrides,
  };
}

describe("generateCode", () => {
  test("returns 6 digits, including leading zeros", () => {
    for (let i = 0; i < 200; i++) {
      expect(generateCode()).toMatch(/^\d{6}$/);
    }
  });
});

describe("hashCode", () => {
  test("is deterministic and never the raw code", () => {
    const hash = hashCode(EMAIL, CODE, PEPPER);
    expect(hash).toBe(hashCode(EMAIL, CODE, PEPPER));
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toContain(CODE);
  });

  test("depends on the pepper, code and email", () => {
    const hash = hashCode(EMAIL, CODE, PEPPER);
    expect(hashCode(EMAIL, CODE, `${PEPPER}x`)).not.toBe(hash);
    expect(hashCode(EMAIL, "654321", PEPPER)).not.toBe(hash);
    expect(hashCode("other@example.com", CODE, PEPPER)).not.toBe(hash);
  });

  test("normalizes email case and whitespace", () => {
    expect(hashCode("  Learner@Example.COM ", CODE, PEPPER)).toBe(
      hashCode(EMAIL, CODE, PEPPER),
    );
  });
});

describe("checkOtp", () => {
  test("accepts the correct code", () => {
    expect(checkOtp(record(), EMAIL, CODE, PEPPER, NOW)).toBe("ok");
  });

  test("rejects a wrong code", () => {
    expect(checkOtp(record(), EMAIL, "000000", PEPPER, NOW)).toBe("invalid");
  });

  test("rejects the right code with the wrong pepper", () => {
    expect(checkOtp(record(), EMAIL, CODE, `${PEPPER}x`, NOW)).toBe("invalid");
  });

  test("expires after the TTL", () => {
    const justBefore = new Date(NOW.getTime() + OTP_TTL_MS - 1);
    const atExpiry = new Date(NOW.getTime() + OTP_TTL_MS);
    expect(checkOtp(record(), EMAIL, CODE, PEPPER, justBefore)).toBe("ok");
    expect(checkOtp(record(), EMAIL, CODE, PEPPER, atExpiry)).toBe("expired");
  });

  test("is single use", () => {
    expect(checkOtp(record({ used: true }), EMAIL, CODE, PEPPER, NOW)).toBe(
      "used",
    );
  });

  test(`allows ${OTP_MAX_ATTEMPTS} attempts, then locks even the right code`, () => {
    expect(
      checkOtp(record({ attempts: OTP_MAX_ATTEMPTS }), EMAIL, CODE, PEPPER, NOW),
    ).toBe("ok");
    expect(
      checkOtp(
        record({ attempts: OTP_MAX_ATTEMPTS + 1 }),
        EMAIL,
        CODE,
        PEPPER,
        NOW,
      ),
    ).toBe("too_many_attempts");
  });
});

describe("schemas", () => {
  test("email is trimmed and lowercased", () => {
    expect(emailSchema.parse("  Learner@Example.COM ")).toBe(EMAIL);
    expect(normalizeEmail("  Learner@Example.COM ")).toBe(EMAIL);
    expect(emailSchema.safeParse("not-an-email").success).toBe(false);
  });

  test("code accepts 6 digits, spaces and Bengali numerals", () => {
    expect(codeSchema.parse("123456")).toBe("123456");
    expect(codeSchema.parse(" 123 456 ")).toBe("123456");
    expect(codeSchema.parse("১২৩৪৫৬")).toBe("123456");
    expect(codeSchema.safeParse("12345").success).toBe(false);
    expect(codeSchema.safeParse("abcdef").success).toBe(false);
  });
});
