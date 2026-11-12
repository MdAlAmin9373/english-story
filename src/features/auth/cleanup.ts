import "server-only";
import { after } from "next/server";
import { db } from "@/lib/db";

// Opportunistic cleanup of old auth rows (allowed exception to the "no delete" rule).
// Runs after the response via after(), bounded per run, and never throws.

/** OTP rows are kept at least this long; must exceed every rate-limit window. */
export const OTP_RETENTION_MS = 24 * 60 * 60 * 1000;
/** Sessions are deleted only once they expired at least this long ago. */
export const SESSION_GRACE_MS = 7 * 24 * 60 * 60 * 1000;
export const CLEANUP_BATCH_SIZE = 200;
/** Per server instance and per kind. */
export const CLEANUP_MIN_INTERVAL_MS = 5 * 60 * 1000;

export type CleanupKind = "otp" | "session";

export function otpCleanupCutoff(now: Date): Date {
  return new Date(now.getTime() - OTP_RETENTION_MS);
}

export function sessionCleanupCutoff(now: Date): Date {
  return new Date(now.getTime() - SESSION_GRACE_MS);
}

// Both columns are checked: expiresAt uses its index, createdAt keeps the
// "older than 1 day" rule true even if the OTP lifetime changes.
function otpWhere(cutoff: Date) {
  return { expiresAt: { lt: cutoff }, createdAt: { lt: cutoff } };
}

export async function cleanupOldOtpCodes(now: Date = new Date()): Promise<number> {
  const where = otpWhere(otpCleanupCutoff(now));
  const rows = await db.otpCode.findMany({
    where,
    select: { id: true },
    orderBy: { expiresAt: "asc" },
    take: CLEANUP_BATCH_SIZE,
  });
  if (rows.length === 0) return 0;
  // The condition is repeated so a row can never be deleted unless it still qualifies.
  const { count } = await db.otpCode.deleteMany({
    where: { id: { in: rows.map((r) => r.id) }, ...where },
  });
  return count;
}

export async function cleanupExpiredSessions(now: Date = new Date()): Promise<number> {
  const where = { expiresAt: { lt: sessionCleanupCutoff(now) } };
  const rows = await db.session.findMany({
    where,
    select: { id: true },
    orderBy: { expiresAt: "asc" },
    take: CLEANUP_BATCH_SIZE,
  });
  if (rows.length === 0) return 0;
  const { count } = await db.session.deleteMany({
    where: { id: { in: rows.map((r) => r.id) }, ...where },
  });
  return count;
}

// Logs only the kind and a Prisma error code; never messages, emails, hashes or tokens.
function logFailure(kind: CleanupKind, err: unknown): void {
  const code = (err as { code?: unknown } | null)?.code;
  if (typeof code === "string" && /^P\d{4}$/.test(code)) {
    console.error("[cleanup] failed:", kind, code);
  } else {
    console.error("[cleanup] failed:", kind);
  }
}

const lastRun = new Map<CleanupKind, number>();

/** Test helper: forget the per-instance throttle. */
export function resetCleanupThrottle(): void {
  lastRun.clear();
}

// Schedules one bounded cleanup after the response. Never throws.
export function scheduleCleanup(kind: CleanupKind, now: number = Date.now()): void {
  const previous = lastRun.get(kind);
  if (previous !== undefined && now - previous < CLEANUP_MIN_INTERVAL_MS) return;
  lastRun.set(kind, now);

  try {
    after(async () => {
      try {
        if (kind === "otp") await cleanupOldOtpCodes();
        else await cleanupExpiredSessions();
      } catch (err) {
        logFailure(kind, err);
      }
    });
  } catch (err) {
    logFailure(kind, err);
  }
}
