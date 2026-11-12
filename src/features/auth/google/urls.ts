// Google's fixed OIDC endpoints. Never derived from the request.
export const GOOGLE_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
export const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
export const GOOGLE_CALLBACK_PATH = "/auth/google/callback";
export const GOOGLE_SCOPES = "openid email";

// Built from the configured APP_URL only, never from the Host header.
export function googleCallbackUrl(appUrl: string): string {
  return new URL(GOOGLE_CALLBACK_PATH, new URL(appUrl).origin).toString();
}

export function buildGoogleAuthUrl(p: {
  clientId: string;
  redirectUri: string;
  state: string;
  nonce: string;
  codeChallenge: string;
}): string {
  const url = new URL(GOOGLE_AUTH_ENDPOINT);
  url.search = new URLSearchParams({
    client_id: p.clientId,
    redirect_uri: p.redirectUri,
    response_type: "code",
    scope: GOOGLE_SCOPES,
    state: p.state,
    nonce: p.nonce,
    code_challenge: p.codeChallenge,
    code_challenge_method: "S256",
    prompt: "select_account",
  }).toString();
  return url.toString();
}
