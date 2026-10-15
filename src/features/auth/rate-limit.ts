import "server-only";
import { db } from "@/lib/db";

// DB-backed so limits hold across serverless instances.
export const EMAIL_LIMIT = { max: 3, windowMs: 15 * 60 * 1000 };
export const IP_LIMIT = { max: 10, windowMs: 60 * 60 * 1000 };

export async function canRequestOtp(
  email: string,
  ipHash: string | null,
): Promise<boolean> {
  const now = Date.now();

  const byEmail = await db.otpCode.count({
    where: {
      email,
      createdAt: { gt: new Date(now - EMAIL_LIMIT.windowMs) },
    },
  });
  if (byEmail >= EMAIL_LIMIT.max) return false;

  if (ipHash) {
    const byIp = await db.otpCode.count({
      where: {
        ipHash,
        createdAt: { gt: new Date(now - IP_LIMIT.windowMs) },
      },
    });
    if (byIp >= IP_LIMIT.max) return false;
  }

  return true;
}
