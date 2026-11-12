import "server-only";
import { z } from "zod";

const serverEnvSchema = z.object({
  OTP_PEPPER: z.string().min(32),
  OTP_DELIVERY: z.enum(["console", "resend"]).default("console"),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | undefined;

// Read lazily so `next build` does not need the values. The error names the
// variables only, never their values.
export function serverEnv(): ServerEnv {
  if (!cached) {
    const parsed = serverEnvSchema.safeParse(process.env);
    if (!parsed.success) {
      const names = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
      throw new Error(`Invalid server environment variables: ${names}`);
    }
    cached = parsed.data;
  }
  return cached;
}

// Resend config, checked only when OTP_DELIVERY="resend" and only at send time,
// so a Resend mistake can never break code verification or Google sign-in.

/** Thrown for missing or invalid variables; `variables` holds names only, never values. */
export class EnvConfigError extends Error {
  constructor(readonly variables: string[]) {
    super(`Invalid server environment variables: ${variables.join(", ")}`);
    this.name = "EnvConfigError";
  }
}

// "Name <address>" or a bare address; the name may not contain <, > or line breaks.
const FROM_PATTERN = /^(?:([^<>\r\n]*?)\s*<([^<>\s]+)>|([^<>\s]+))$/;

function isValidFrom(value: string): boolean {
  const match = FROM_PATTERN.exec(value);
  if (!match) return false;
  const address = match[2] ?? match[3];
  return z.email().safeParse(address).success;
}

const resendEnvSchema = z.object({
  RESEND_API_KEY: z.string().trim().regex(/^re_\S+$/),
  EMAIL_FROM: z.string().trim().refine(isValidFrom),
});

export type ResendEnv = z.infer<typeof resendEnvSchema>;

// Not cached: read on each send, so a fixed value takes effect without a restart.
export function resendEnv(env: Record<string, string | undefined> = process.env): ResendEnv {
  const parsed = resendEnvSchema.safeParse(env);
  if (!parsed.success) {
    throw new EnvConfigError([...new Set(parsed.error.issues.map((i) => i.path.join(".")))]);
  }
  return parsed.data;
}

// Google sign-in config, kept apart from serverEnv() so a missing Google
// variable can never break OTP login.

// https, or http only for a local host (dev and `next start` on this machine).
function isAllowedAppUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.username || url.password) return false;
  if (url.protocol === "https:") return true;
  return url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname);
}

const googleEnvSchema = z.object({
  GOOGLE_CLIENT_ID: z.string().trim().min(1),
  GOOGLE_CLIENT_SECRET: z.string().trim().min(1),
  APP_URL: z
    .string()
    .trim()
    .refine(isAllowedAppUrl)
    .transform((v) => new URL(v).origin),
});

export type GoogleEnv = z.infer<typeof googleEnvSchema>;

// Not cached: only read when a Google login starts or returns. The error
// names the variables only, never their values.
export function googleEnv(env: Record<string, string | undefined> = process.env): GoogleEnv {
  const parsed = googleEnvSchema.safeParse(env);
  if (!parsed.success) {
    const names = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`Invalid Google environment variables: ${names}`);
  }
  return parsed.data;
}
