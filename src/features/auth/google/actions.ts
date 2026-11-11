"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { googleEnv, type GoogleEnv } from "@/lib/env";
import { safeNextPath } from "../next-path";
import { createPkce, randomToken } from "./crypto";
import { googleErrorPath } from "./errors";
import { encodeState, stateCookieName, stateCookieOptions } from "./state-cookie";
import { buildGoogleAuthUrl, googleCallbackUrl } from "./urls";

// Started by a form POST (never a GET link), so prefetching can't begin a login.
// The redirect_uri comes from APP_URL only, never from the Host header.
export async function startGoogleLogin(formData: FormData): Promise<void> {
  let env: GoogleEnv;
  try {
    env = googleEnv();
  } catch {
    console.error("[google] start failed:", "config");
    redirect(googleErrorPath("google_failed"));
  }

  const state = randomToken();
  const nonce = randomToken();
  const pkce = createPkce();
  const next = safeNextPath(formData.get("next"));

  (await cookies()).set(
    stateCookieName(),
    encodeState({ state, nonce, verifier: pkce.verifier, next }),
    stateCookieOptions(),
  );

  redirect(
    buildGoogleAuthUrl({
      clientId: env.GOOGLE_CLIENT_ID,
      redirectUri: googleCallbackUrl(env.APP_URL),
      state,
      nonce,
      codeChallenge: pkce.challenge,
    }),
  );
}
