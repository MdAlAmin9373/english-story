// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

// In-memory cookie store and a redirect() that throws like the real one.
const jar = vi.hoisted(() => new Map<string, { value: string; options: unknown }>());
const Redirect = vi.hoisted(
  () =>
    class Redirect extends Error {
      constructor(public url: string) {
        super("NEXT_REDIRECT");
      }
    },
);

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)!.value } : undefined),
    set: (name: string, value: string, options: unknown) => jar.set(name, { value, options }),
  }),
  // A hostile Host header: the action must never use it.
  headers: async () => new Headers({ host: "evil.com", "x-forwarded-host": "evil.com" }),
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Redirect(url);
  },
}));

const { startGoogleLogin } = await import("@/features/auth/google/actions");
const { decodeState } = await import("@/features/auth/google/state-cookie");
const { pkceChallenge } = await import("@/features/auth/google/crypto");

const CLIENT_ID = "123-abc.apps.googleusercontent.com";
const SECRET = "test-client-secret";

async function start(next?: string): Promise<URL> {
  const form = new FormData();
  if (next !== undefined) form.set("next", next);
  try {
    await startGoogleLogin(form);
  } catch (err) {
    if (err instanceof Redirect) return new URL(err.url, "http://relative.invalid");
    throw err;
  }
  throw new Error("expected a redirect");
}

beforeEach(() => {
  jar.clear();
  vi.stubEnv("GOOGLE_CLIENT_ID", CLIENT_ID);
  vi.stubEnv("GOOGLE_CLIENT_SECRET", SECRET);
  vi.stubEnv("APP_URL", "https://netenglish.online");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("startGoogleLogin", () => {
  test("redirects to Google's fixed endpoint with all parameters", async () => {
    const url = await start();
    expect(url.origin + url.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    const p = url.searchParams;
    expect(p.get("client_id")).toBe(CLIENT_ID);
    expect(p.get("response_type")).toBe("code");
    expect(p.get("scope")).toBe("openid email profile");
    expect(p.get("prompt")).toBe("select_account");
    expect(p.get("code_challenge_method")).toBe("S256");
    expect(url.toString()).not.toContain(SECRET);
  });

  test("redirect_uri comes from APP_URL, not the Host header", async () => {
    const url = await start();
    expect(url.searchParams.get("redirect_uri")).toBe(
      "https://netenglish.online/auth/google/callback",
    );
    expect(url.toString()).not.toContain("evil.com");
  });

  test("state cookie matches the URL's state, nonce and PKCE challenge", async () => {
    const url = await start("/stories/x/2");
    const cookie = jar.get("es_google")!;
    expect(cookie.options).toEqual({
      httpOnly: true,
      sameSite: "lax",
      secure: false, // NODE_ENV is "test"; Secure + __Host- in production
      path: "/",
      maxAge: 600,
    });
    const saved = decodeState(cookie.value)!;
    expect(saved.state).toBe(url.searchParams.get("state"));
    expect(saved.nonce).toBe(url.searchParams.get("nonce"));
    expect(pkceChallenge(saved.verifier)).toBe(url.searchParams.get("code_challenge"));
    expect(saved.next).toBe("/stories/x/2");
    // The verifier itself never leaves the server.
    expect(url.toString()).not.toContain(saved.verifier);
  });

  test.each(["https://evil.com", "//evil.com", "/\\evil.com", undefined])(
    "unsafe or missing next %s is stored as /dashboard",
    async (next) => {
      await start(next);
      expect(decodeState(jar.get("es_google")!.value)!.next).toBe("/dashboard");
    },
  );

  test("every start uses fresh random values", async () => {
    const a = (await start()).searchParams;
    const b = (await start()).searchParams;
    expect(a.get("state")).not.toBe(b.get("state"));
    expect(a.get("nonce")).not.toBe(b.get("nonce"));
    expect(a.get("code_challenge")).not.toBe(b.get("code_challenge"));
  });

  test("missing Google config → /login?error=google_failed, no cookie, safe log", async () => {
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "");
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const url = await start();
    expect(url.pathname + url.search).toBe("/login?error=google_failed");
    expect(jar.size).toBe(0);
    expect(log).toHaveBeenCalledWith("[google] start failed:", "config");
  });
});
