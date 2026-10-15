"use server";

import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { serverEnv } from "@/lib/env";
import { deliverOtp } from "./delivery";
import { checkOtp, generateCode, hashCode, otpExpiry } from "./otp";
import { canRequestOtp } from "./rate-limit";
import { codeSchema, emailSchema } from "./schemas";
import {
  clearPendingEmail,
  createSession,
  destroySession,
  getPendingEmail,
  setPendingEmail,
} from "./session";

export type AuthFormState = { error?: string };

const MSG = {
  rateLimited: "অনেকবার চেষ্টা করা হয়েছে। কিছুক্ষণ পরে আবার চেষ্টা করুন।",
  sendFailed: "কোড পাঠানো যায়নি। একটু পরে আবার চেষ্টা করুন।",
  invalidCode: "কোডটি সঠিক নয়। আবার চেষ্টা করুন।",
  expired: "কোডটির মেয়াদ শেষ হয়ে গেছে। নতুন কোড নিন।",
  tooManyAttempts: "অনেকবার ভুল কোড দেওয়া হয়েছে। নতুন কোড নিন।",
} as const;

async function clientIpHash(pepper: string): Promise<string | null> {
  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip");
  if (!ip) return null;
  return createHmac("sha256", pepper).update(`ip:${ip}`).digest("hex");
}

export async function requestOtp(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = emailSchema.safeParse(formData.get("email") ?? "");
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const email = parsed.data; // already trimmed + lowercased

  const { OTP_PEPPER } = serverEnv();
  const ipHash = await clientIpHash(OTP_PEPPER);

  if (!(await canRequestOtp(email, ipHash))) {
    return { error: MSG.rateLimited };
  }

  const code = generateCode();
  const [, otp] = await db.$transaction([
    // Only the newest code is valid.
    db.otpCode.updateMany({
      where: { email, used: false },
      data: { used: true },
    }),
    db.otpCode.create({
      data: {
        email,
        codeHash: hashCode(email, code, OTP_PEPPER),
        expiresAt: otpExpiry(),
        ipHash,
      },
      select: { id: true },
    }),
  ]);

  try {
    await deliverOtp(email, code);
  } catch (err) {
    await db.otpCode.update({ where: { id: otp.id }, data: { used: true } });
    console.error("[otp] delivery failed:", (err as Error).message);
    return { error: MSG.sendFailed };
  }

  await setPendingEmail(email);
  redirect("/login/verify");
}

export async function verifyOtp(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = await getPendingEmail();
  if (!email) redirect("/login");

  const parsed = codeSchema.safeParse(formData.get("code") ?? "");
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const code = parsed.data;

  const latest = await db.otpCode.findFirst({
    where: { email, used: false },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (!latest) return { error: MSG.expired };

  // Count this attempt before comparing, so guesses are always recorded.
  const record = await db.otpCode.update({
    where: { id: latest.id },
    data: { attempts: { increment: 1 } },
  });

  const result = checkOtp(record, email, code, serverEnv().OTP_PEPPER);
  switch (result) {
    case "invalid":
      return { error: MSG.invalidCode };
    case "too_many_attempts":
      return { error: MSG.tooManyAttempts };
    case "expired":
    case "used":
      return { error: MSG.expired };
  }

  // Atomic single use: a concurrent request with the same code loses here.
  const consumed = await db.otpCode.updateMany({
    where: { id: record.id, used: false },
    data: { used: true },
  });
  if (consumed.count !== 1) return { error: MSG.expired };

  const user = await db.user.upsert({
    where: { email },
    create: { email },
    update: {},
    select: { id: true },
  });
  await createSession(user.id);
  await clearPendingEmail();
  redirect("/dashboard");
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/");
}
