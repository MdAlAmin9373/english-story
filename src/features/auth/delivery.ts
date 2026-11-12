import "server-only";
import { EnvConfigError, resendEnv, serverEnv, type ResendEnv } from "@/lib/env";
import { OtpDeliveryError } from "./delivery-error";
import { buildOtpEmail } from "./otp-email";

export const RESEND_API_URL = "https://api.resend.com/emails";
export const RESEND_TIMEOUT_MS = 10_000;

// Throws OtpDeliveryError on any failure; resolves only when the code was handed over.
export async function deliverOtp(email: string, code: string): Promise<void> {
  const { OTP_DELIVERY } = serverEnv();

  if (OTP_DELIVERY === "console") {
    if (process.env.NODE_ENV === "production") {
      throw new OtpDeliveryError("config", "OTP_DELIVERY");
    }
    // Development only: this is the one place a code is ever printed.
    console.info(`[otp] login code for ${email}: ${code}`);
    return;
  }

  await sendWithResend(email, code);
}

async function sendWithResend(email: string, code: string): Promise<void> {
  let config: ResendEnv;
  try {
    config = resendEnv();
  } catch (err) {
    const names = err instanceof EnvConfigError ? err.variables.join(", ") : undefined;
    throw new OtpDeliveryError("config", names);
  }

  const { subject, text, html } = buildOtpEmail(code);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), RESEND_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: config.EMAIL_FROM, to: [email], subject, text, html }),
      signal: controller.signal,
    });
  } catch {
    // The error itself is dropped: it may echo request details.
    throw new OtpDeliveryError(controller.signal.aborted ? "timeout" : "network");
  } finally {
    clearTimeout(timer);
  }

  // The response body is never read or logged; release it.
  await response.body?.cancel().catch(() => {});
  if (!response.ok) throw new OtpDeliveryError("http", response.status);
}
