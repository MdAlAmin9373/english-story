// The only values /login?error= understands. Anything else shows nothing.
export const GOOGLE_ERROR_CODES = [
  "google_cancelled",
  "google_expired",
  "google_unverified",
  "google_conflict",
  "google_failed",
] as const;

export type GoogleErrorCode = (typeof GOOGLE_ERROR_CODES)[number];

const MESSAGES: Record<GoogleErrorCode, string> = {
  google_cancelled: "Google লগইন বাতিল করা হয়েছে।",
  google_expired: "লগইনের সময় শেষ হয়ে গেছে। আবার চেষ্টা করুন।",
  google_unverified: "এই Google অ্যাকাউন্টের ইমেইল যাচাই করা নেই।",
  google_conflict: "এই Google অ্যাকাউন্ট দিয়ে লগইন করা যাচ্ছে না। ইমেইল দিয়ে লগইন করুন।",
  google_failed: "Google দিয়ে লগইন করা যায়নি। আবার চেষ্টা করুন।",
};

// Object.hasOwn keeps "constructor", "__proto__" etc. from matching.
export function googleErrorMessage(value: unknown): string | null {
  if (typeof value !== "string" || !Object.hasOwn(MESSAGES, value)) return null;
  return MESSAGES[value as GoogleErrorCode];
}

export function googleErrorPath(code: GoogleErrorCode): string {
  return `/login?error=${code}`;
}
