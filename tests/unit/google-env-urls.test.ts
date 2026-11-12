// @vitest-environment node
import { describe, expect, test, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { googleEnv, serverEnv } = await import("@/lib/env");
const { buildGoogleAuthUrl, googleCallbackUrl } = await import("@/features/auth/google/urls");

const base = {
  GOOGLE_CLIENT_ID: "123-abc.apps.googleusercontent.com",
  GOOGLE_CLIENT_SECRET: "test-secret",
  APP_URL: "http://localhost:3000",
};

describe("googleEnv", () => {
  test("valid config; APP_URL reduced to its origin", () => {
    expect(googleEnv({ ...base, APP_URL: "https://netenglish.online/some/path/" })).toEqual({
      ...base,
      APP_URL: "https://netenglish.online",
    });
  });

  test.each(["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "APP_URL"])(
    "missing %s throws, naming only the variable",
    (name) => {
      const env: Record<string, string | undefined> = { ...base, [name]: undefined };
      expect(() => googleEnv(env)).toThrow(name);
      expect(() => googleEnv(env)).not.toThrow("test-secret");
    },
  );

  test.each([
    "not a url",
    "http://netenglish.online", // http only for local hosts
    "ftp://localhost",
    "https://user:pass@netenglish.online",
  ])("rejected APP_URL %s", (APP_URL) => {
    expect(() => googleEnv({ ...base, APP_URL })).toThrow("APP_URL");
  });

  test("http://127.0.0.1 is allowed", () => {
    expect(googleEnv({ ...base, APP_URL: "http://127.0.0.1:3000" }).APP_URL).toBe(
      "http://127.0.0.1:3000",
    );
  });

  test("missing Google vars do not affect serverEnv() (OTP)", () => {
    vi.stubEnv("OTP_PEPPER", "p".repeat(32));
    vi.stubEnv("GOOGLE_CLIENT_ID", "");
    expect(() => googleEnv()).toThrow();
    expect(serverEnv().OTP_PEPPER).toBe("p".repeat(32));
    vi.unstubAllEnvs();
  });
});

describe("googleCallbackUrl", () => {
  test.each([
    ["http://localhost:3000", "http://localhost:3000/auth/google/callback"],
    ["https://netenglish.online", "https://netenglish.online/auth/google/callback"],
    ["https://netenglish.online/", "https://netenglish.online/auth/google/callback"],
    ["https://netenglish.online/x?y=1", "https://netenglish.online/auth/google/callback"],
  ])("%s → %s", (appUrl, expected) => {
    expect(googleCallbackUrl(appUrl)).toBe(expected);
  });
});

describe("buildGoogleAuthUrl", () => {
  test("fixed endpoint and all required parameters", () => {
    const url = new URL(
      buildGoogleAuthUrl({
        clientId: base.GOOGLE_CLIENT_ID,
        redirectUri: "https://netenglish.online/auth/google/callback",
        state: "S",
        nonce: "N",
        codeChallenge: "C",
      }),
    );
    expect(url.origin + url.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      client_id: base.GOOGLE_CLIENT_ID,
      redirect_uri: "https://netenglish.online/auth/google/callback",
      response_type: "code",
      scope: "openid email",
      state: "S",
      nonce: "N",
      code_challenge: "C",
      code_challenge_method: "S256",
      prompt: "select_account",
    });
  });
});
