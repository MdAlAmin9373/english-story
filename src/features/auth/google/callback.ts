import "server-only";
import { cookies } from "next/headers";
import { googleEnv, type GoogleEnv } from "@/lib/env";
import { createSession } from "../session";
import { decodeIdTokenPayload, validateIdTokenClaims } from "./claims";
import { safeEqual } from "./crypto";
import { googleErrorPath, type GoogleErrorCode } from "./errors";
import { linkGoogleUser } from "./link";
import { decodeState, stateCookieName, stateCookieOptions } from "./state-cookie";
import { exchangeCode } from "./token";
import { googleCallbackUrl } from "./urls";

const MAX_CODE_LENGTH = 2048;

// Logs only a fixed category: never the code, tokens, cookie or secret.
function fail(code: GoogleErrorCode, category: string): string {
  console.error("[google] callback failed:", category);
  return googleErrorPath(code);
}

// Handles GET /auth/google/callback and returns the path to redirect to.
// `next` comes only from the state cookie, never from the callback URL.
export async function handleGoogleCallback(params: URLSearchParams): Promise<string> {
  const store = await cookies();
  const name = stateCookieName();
  const raw = store.get(name)?.value;
  // Single use: delete before any check. A __Host- cookie is only removed
  // when the deletion carries the same Secure and Path attributes.
  store.set(name, "", { ...stateCookieOptions(), maxAge: 0 });

  if (params.has("error")) {
    return params.get("error") === "access_denied"
      ? fail("google_cancelled", "cancelled")
      : fail("google_failed", "google_error");
  }

  const code = params.get("code");
  if (!code || code.length > MAX_CODE_LENGTH) return fail("google_failed", "missing_code");

  const saved = decodeState(raw);
  if (!saved) return fail("google_expired", "cookie_missing");

  const state = params.get("state");
  if (!state || !safeEqual(state, saved.state)) return fail("google_failed", "state_mismatch");

  let env: GoogleEnv;
  try {
    env = googleEnv();
  } catch {
    return fail("google_failed", "config");
  }

  const token = await exchangeCode({
    code,
    verifier: saved.verifier,
    redirectUri: googleCallbackUrl(env.APP_URL),
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
  });
  if (!token.ok) return fail("google_failed", token.category);

  const payload = decodeIdTokenPayload(token.idToken);
  if (!payload) return fail("google_failed", "id_token_malformed");

  const claims = validateIdTokenClaims(payload, {
    clientId: env.GOOGLE_CLIENT_ID,
    nonce: saved.nonce,
  });
  if (!claims.ok) {
    return fail(
      claims.code,
      claims.code === "google_unverified" ? "email_unverified" : "claims_invalid",
    );
  }

  try {
    const link = await linkGoogleUser({ sub: claims.sub, email: claims.email });
    if (!link.ok) return fail(link.code, link.category);
    // Same session and cookie as the OTP login.
    await createSession(link.userId);
  } catch {
    return fail("google_failed", "db_error");
  }

  return saved.next;
}
