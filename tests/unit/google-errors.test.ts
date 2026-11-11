import { describe, expect, test } from "vitest";
import {
  GOOGLE_ERROR_CODES,
  googleErrorMessage,
  googleErrorPath,
} from "@/features/auth/google/errors";

describe("googleErrorMessage", () => {
  test.each(GOOGLE_ERROR_CODES)("%s has a Bengali message", (code) => {
    const msg = googleErrorMessage(code);
    expect(msg).toBeTruthy();
    expect(msg).toMatch(/[ঀ-৿]/);
  });

  test("each code has its own message", () => {
    const messages = new Set(GOOGLE_ERROR_CODES.map(googleErrorMessage));
    expect(messages.size).toBe(GOOGLE_ERROR_CODES.length);
  });

  test.each([
    "unknown",
    "access_denied",
    "GOOGLE_FAILED",
    "",
    "constructor",
    "__proto__",
    "toString",
    "hasOwnProperty",
    undefined,
    null,
    ["google_failed"],
    42,
  ])("unknown value %j → null", (value) => {
    expect(googleErrorMessage(value)).toBeNull();
  });
});

test("googleErrorPath", () => {
  expect(googleErrorPath("google_expired")).toBe("/login?error=google_expired");
});
