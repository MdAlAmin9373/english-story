import "server-only";
import { GOOGLE_TOKEN_ENDPOINT } from "./urls";

export const TOKEN_TIMEOUT_MS = 10_000;

export type TokenFailure = "token_timeout" | "token_network" | "token_status" | "token_body";
export type TokenResult = { ok: true; idToken: string } | { ok: false; category: TokenFailure };

// Exchanges the authorization code for an ID token. Only id_token is read;
// the access token is never stored or returned.
export async function exchangeCode(p: {
  code: string;
  verifier: string;
  redirectUri: string;
  clientId: string;
  clientSecret: string;
}): Promise<TokenResult> {
  let res: Response;
  try {
    res = await fetch(GOOGLE_TOKEN_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: p.code,
        code_verifier: p.verifier,
        redirect_uri: p.redirectUri,
        client_id: p.clientId,
        client_secret: p.clientSecret,
      }),
      signal: AbortSignal.timeout(TOKEN_TIMEOUT_MS),
      cache: "no-store",
      redirect: "error",
    });
  } catch (err) {
    const timedOut = err instanceof Error && err.name === "TimeoutError";
    return { ok: false, category: timedOut ? "token_timeout" : "token_network" };
  }

  if (res.status !== 200) return { ok: false, category: "token_status" };

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    return { ok: false, category: "token_body" };
  }
  const idToken = (body as { id_token?: unknown } | null)?.id_token;
  if (typeof idToken !== "string" || idToken.length === 0) {
    return { ok: false, category: "token_body" };
  }
  return { ok: true, idToken };
}
