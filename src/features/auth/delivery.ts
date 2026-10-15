import "server-only";
import { serverEnv } from "@/lib/env";

export async function deliverOtp(email: string, code: string): Promise<void> {
  const { OTP_DELIVERY } = serverEnv();

  if (OTP_DELIVERY === "console") {
    if (process.env.NODE_ENV === "production") {
      throw new Error("OTP_DELIVERY=console is not allowed in production");
    }
    // Development only: this is the one place a code is ever printed.
    console.info(`[otp] login code for ${email}: ${code}`);
    return;
  }

  // TODO(resend): send the code by email using RESEND_API_KEY and EMAIL_FROM.
  throw new Error("OTP_DELIVERY=resend is not implemented yet");
}
