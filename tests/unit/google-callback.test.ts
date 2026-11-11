// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

// In-memory cookie store (maxAge 0 deletes), mocked database and session.
const jar = vi.hoisted(() => new Map<string, string>());
const cookieSets = vi.hoisted(() => [] as Array<{ name: string; options: Record<string, unknown> }>);
const db = vi.hoisted(() => ({
  user: { findUnique: vi.fn(), updateMany: vi.fn(), create: vi.fn() },
}));
const createSession = vi.hoisted(() => vi.fn());
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
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)! } : undefined),
    set: (name: string, value: string, options: Record<string, unknown>) => {
      cookieSets.push({ name, options });
      if (options.maxAge === 0) jar.delete(name);
      else jar.set(name, value);
    },
  }),
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Redirect(url);
  },
}));
vi.mock("@/lib/db", () => ({ db }));
vi.mock("@/features/auth/session", () => ({ createSession }));

const { handleGoogleCallback } = await import("@/features/auth/google/callback");
const { encodeState } = await import("@/features/auth/google/state-cookie");
const { GET } = await import("@/app/auth/google/callback/route");

const CLIENT_ID = "123-abc.apps.googleusercontent.com";
const SECRET = "test-client-secret-value";
const STATE = "s".repeat(43);
const NONCE = "n".repeat(43);
const VERIFIER = "v".repeat(43);
const CODE = "4/secret-authorization-code";
const NEXT = "/stories/x/2";

function idToken(overrides: Record<string, unknown> = {}): string {
  const now = Math.floor(Date.now() / 1000);
  const enc = (v: unknown) => Buffer.from(JSON.stringify(v)).toString("base64url");
  const claims = {
    iss: "https://accounts.google.com",
    aud: CLIENT_ID,
    azp: CLIENT_ID,
    sub: "google-sub-1",
    email: "Learner@Example.com",
    email_verified: true,
    iat: now,
    exp: now + 3600,
    nonce: NONCE,
    ...overrides,
  };
  return `${enc({ alg: "RS256" })}.${enc(claims)}.c2lnbmF0dXJl`;
}

let ID_TOKEN = "";
const fetchMock = vi.fn();
let log: ReturnType<typeof vi.spyOn>;

function tokenResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function setStateCookie(iat = Date.now()) {
  jar.set("es_google", encodeState({ state: STATE, nonce: NONCE, verifier: VERIFIER, next: NEXT }, iat));
}

const params = (p: Record<string, string> = { code: CODE, state: STATE }) =>
  new URLSearchParams(p);

beforeEach(() => {
  jar.clear();
  cookieSets.length = 0;
  vi.clearAllMocks();
  vi.stubEnv("GOOGLE_CLIENT_ID", CLIENT_ID);
  vi.stubEnv("GOOGLE_CLIENT_SECRET", SECRET);
  vi.stubEnv("APP_URL", "http://localhost:3000");
  vi.stubGlobal("fetch", fetchMock);
  log = vi.spyOn(console, "error").mockImplementation(() => {});

  ID_TOKEN = idToken();
  fetchMock.mockImplementation(async () => tokenResponse({ id_token: ID_TOKEN, access_token: "ya29.secret-access" }));
  db.user.findUnique.mockResolvedValue(null);
  db.user.updateMany.mockResolvedValue({ count: 1 });
  db.user.create.mockResolvedValue({ id: "new-user" });
  createSession.mockResolvedValue(undefined);
  setStateCookie();
});

afterEach(() => {
  // No log line may ever contain a secret value.
  const logged = JSON.stringify(log.mock.calls);
  for (const secret of [SECRET, CODE, ID_TOKEN, "ya29.secret-access", STATE, NONCE, VERIFIER]) {
    expect(logged).not.toContain(secret);
  }
  for (const [prefix, category] of log.mock.calls) {
    expect(prefix).toBe("[google] callback failed:");
    expect(category).toMatch(/^[a-z_]+$/);
  }
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function expectNoLogin() {
  expect(createSession).not.toHaveBeenCalled();
  expect(db.user.create).not.toHaveBeenCalled();
  expect(db.user.updateMany).not.toHaveBeenCalled();
}

describe("handleGoogleCallback: success", () => {
  test("new user: created, session started, redirected to the saved next", async () => {
    expect(await handleGoogleCallback(params())).toBe(NEXT);
    expect(db.user.create).toHaveBeenCalledWith({
      data: { email: "learner@example.com", googleSub: "google-sub-1" },
      select: { id: true },
    });
    expect(createSession).toHaveBeenCalledExactlyOnceWith("new-user");
    expect(log).not.toHaveBeenCalled();
  });

  test("existing user: linked and logged in", async () => {
    db.user.findUnique.mockImplementation(({ where }: { where: Record<string, string> }) =>
      Promise.resolve("email" in where ? { id: "u1", googleSub: null } : null),
    );
    expect(await handleGoogleCallback(params())).toBe(NEXT);
    expect(db.user.updateMany).toHaveBeenCalledWith({
      where: { id: "u1", googleSub: null },
      data: { googleSub: "google-sub-1" },
    });
    expect(createSession).toHaveBeenCalledExactlyOnceWith("u1");
  });

  test("token request: fixed endpoint, PKCE verifier, redirect_uri from APP_URL, timeout signal", async () => {
    await handleGoogleCallback(params());
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://oauth2.googleapis.com/token");
    expect(init.method).toBe("POST");
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(Object.fromEntries(init.body as URLSearchParams)).toEqual({
      grant_type: "authorization_code",
      code: CODE,
      code_verifier: VERIFIER,
      redirect_uri: "http://localhost:3000/auth/google/callback",
      client_id: CLIENT_ID,
      client_secret: SECRET,
    });
  });

  test("?next= in the callback URL is ignored", async () => {
    expect(await handleGoogleCallback(params({ code: CODE, state: STATE, next: "/admin" }))).toBe(NEXT);
  });

  test("the state cookie is deleted with the same attributes", async () => {
    await handleGoogleCallback(params());
    expect(jar.has("es_google")).toBe(false);
    expect(cookieSets).toEqual([
      {
        name: "es_google",
        options: { httpOnly: true, sameSite: "lax", secure: false, path: "/", maxAge: 0 },
      },
    ]);
  });
});

describe("handleGoogleCallback: failures", () => {
  test("user cancelled (access_denied) → google_cancelled", async () => {
    expect(await handleGoogleCallback(params({ error: "access_denied", state: STATE }))).toBe(
      "/login?error=google_cancelled",
    );
    expect(fetchMock).not.toHaveBeenCalled();
    expectNoLogin();
  });

  test("other Google error → google_failed, raw error not shown", async () => {
    const res = await handleGoogleCallback(
      params({ error: "server_error", error_description: "<b>x</b>", code: CODE, state: STATE }),
    );
    expect(res).toBe("/login?error=google_failed");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("missing code → google_failed", async () => {
    expect(await handleGoogleCallback(params({ state: STATE }))).toBe("/login?error=google_failed");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("missing cookie → google_expired", async () => {
    jar.clear();
    expect(await handleGoogleCallback(params())).toBe("/login?error=google_expired");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("expired cookie (older than 10 minutes) → google_expired", async () => {
    setStateCookie(Date.now() - 11 * 60 * 1000);
    expect(await handleGoogleCallback(params())).toBe("/login?error=google_expired");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("cookie reused: the second callback fails", async () => {
    expect(await handleGoogleCallback(params())).toBe(NEXT);
    expect(await handleGoogleCallback(params())).toBe("/login?error=google_expired");
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(createSession).toHaveBeenCalledOnce();
  });

  test.each([
    ["wrong state", { code: CODE, state: "x".repeat(43) }],
    ["missing state", { code: CODE }],
  ])("%s → google_failed", async (_label, p) => {
    expect(await handleGoogleCallback(params(p))).toBe("/login?error=google_failed");
    expect(fetchMock).not.toHaveBeenCalled();
    expectNoLogin();
  });

  test.each([
    ["non-200", async () => tokenResponse({ error: "invalid_grant" }, 400)],
    ["network error", async () => Promise.reject(new TypeError("fetch failed"))],
    ["timeout", async () => Promise.reject(new DOMException("timed out", "TimeoutError"))],
    ["no id_token", async () => tokenResponse({ access_token: "ya29.secret-access" })],
    ["invalid JSON", async () => new Response("not json", { status: 200 })],
    ["malformed id_token", async () => tokenResponse({ id_token: "not-a-jwt" })],
  ])("token endpoint: %s → google_failed", async (_label, impl) => {
    fetchMock.mockImplementation(impl);
    expect(await handleGoogleCallback(params())).toBe("/login?error=google_failed");
    expectNoLogin();
  });

  test("timeout is logged as its own category", async () => {
    fetchMock.mockRejectedValue(new DOMException("timed out", "TimeoutError"));
    await handleGoogleCallback(params());
    expect(log).toHaveBeenCalledWith("[google] callback failed:", "token_timeout");
  });

  test.each([
    ["wrong iss", { iss: "https://evil.com" }],
    ["wrong aud", { aud: "other-client", azp: "other-client" }],
    ["expired token", { exp: Math.floor(Date.now() / 1000) - 120 }],
    ["nonce mismatch", { nonce: "x".repeat(43) }],
  ])("%s → google_failed", async (_label, overrides) => {
    ID_TOKEN = idToken(overrides);
    expect(await handleGoogleCallback(params())).toBe("/login?error=google_failed");
    expectNoLogin();
  });

  test("email_verified false → google_unverified", async () => {
    ID_TOKEN = idToken({ email_verified: false });
    expect(await handleGoogleCallback(params())).toBe("/login?error=google_unverified");
    expectNoLogin();
  });

  test("conflicting Google sub → google_conflict, no session", async () => {
    db.user.findUnique.mockImplementation(({ where }: { where: Record<string, string> }) =>
      Promise.resolve("email" in where ? { id: "u1", googleSub: "other-sub" } : null),
    );
    expect(await handleGoogleCallback(params())).toBe("/login?error=google_conflict");
    expectNoLogin();
  });

  test("sub linked to another user → google_conflict", async () => {
    db.user.findUnique.mockImplementation(({ where }: { where: Record<string, string> }) =>
      Promise.resolve("googleSub" in where ? { id: "u2" } : { id: "u1", googleSub: null }),
    );
    expect(await handleGoogleCallback(params())).toBe("/login?error=google_conflict");
    expectNoLogin();
  });

  test("database error → google_failed", async () => {
    db.user.findUnique.mockRejectedValue(new Error("connection lost"));
    expect(await handleGoogleCallback(params())).toBe("/login?error=google_failed");
    expect(createSession).not.toHaveBeenCalled();
  });

  test("missing Google config → google_failed", async () => {
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "");
    expect(await handleGoogleCallback(params())).toBe("/login?error=google_failed");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test.each([
    ["Google error", { error: "access_denied" }],
    ["missing code", {}],
    ["state mismatch", { code: CODE, state: "bad" }],
  ])("the cookie is deleted on failure too (%s)", async (_label, p) => {
    await handleGoogleCallback(params(p));
    expect(jar.has("es_google")).toBe(false);
  });
});

describe("GET /auth/google/callback", () => {
  test("redirects to the handler's result", async () => {
    const request = { nextUrl: new URL(`http://localhost:3000/auth/google/callback?code=${CODE}&state=${STATE}`) };
    await expect(GET(request as never)).rejects.toMatchObject({ url: NEXT });
  });
});
