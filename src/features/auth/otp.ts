// Pure OTP logic: no database, no request APIs, so it can be unit tested.
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

export const OTP_TTL_MS = 10 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;

export type OtpRecord = {
  codeHash: string;
  expiresAt: Date;
  used: boolean;
  /** Must already include the current attempt (increment before checking). */
  attempts: number;
};

export type OtpCheckResult =
  | "ok"
  | "expired"
  | "used"
  | "too_many_attempts"
  | "invalid";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function generateCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function hashCode(email: string, code: string, pepper: string): string {
  return createHmac("sha256", pepper)
    .update(`${normalizeEmail(email)}:${code}`)
    .digest("hex");
}

export function otpExpiry(now: Date = new Date()): Date {
  return new Date(now.getTime() + OTP_TTL_MS);
}

export function checkOtp(
  record: OtpRecord,
  email: string,
  code: string,
  pepper: string,
  now: Date = new Date(),
): OtpCheckResult {
  if (record.used) return "used";
  if (record.expiresAt.getTime() <= now.getTime()) return "expired";
  if (record.attempts > OTP_MAX_ATTEMPTS) return "too_many_attempts";

  const expected = Buffer.from(record.codeHash, "hex");
  const actual = Buffer.from(hashCode(email, code, pepper), "hex");
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return "invalid";
  }
  return "ok";
}
