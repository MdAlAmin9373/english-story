// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { fake } from "./helpers/fake-db";

// requestOtp end to end with the real delivery code: Resend is replaced by a
// fake fetch, the database by the in-memory fake.
const jar = vi.hoisted(() => new Map<string, string>());
const Redirect = vi.hoisted(
  () =>
    class Redirect extends Error {
      constructor(public url: string) {
        super("NEXT_REDIRECT");
      }
    },
);

vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({ after: () => {} }));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": "203.0.113.7" }),
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)! } : undefined),
    set: (name: string, value: string) => {
      jar.set(name, value);
    },
    delete: (name: string) => {
      jar.delete(name);
    },
  }),
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Redirect(url);
  },
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));
vi.mock("@/lib/db", async () => ({ db: (await import("./helpers/fake-db")).fake.db }));
vi.mock("@/lib/env", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/env")>()),
  serverEnv: () => ({ OTP_PEPPER: PEPPER, OTP_DELIVERY: "resend" }),
}));

const PEPPER = "test-pepper-that-is-at-least-32-characters";
const KEY = "re_test_SECRETKEY_123";
const FROM = "English Story <login@netenglish.online>";
const EMAIL = "learner@example.com";
const SEND_FAILED = "কোড পাঠানো যায়নি। একটু পরে আবার চেষ্টা করুন।";

const { requestOtp, verifyOtp } = await import("@/features/auth/actions");
const { hashCode, OTP_TTL_MS } = await import("@/features/auth/otp");
const { EMAIL_LIMIT } = await import("@/features/auth/rate-limit");
const { RESEND_TIMEOUT_MS } = await import("@/features/auth/delivery");

const fetchMock = vi.fn();
let errorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  fake.reset();
  jar.clear();
  vi.stubEnv("RESEND_API_KEY", KEY);
  vi.stubEnv("EMAIL_FROM", FROM);
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(new Response('{"id":"ok"}', { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const form = (email = EMAIL) => {
  const fd = new FormData();
  fd.set("email", email);
  return fd;
};

async function outcome(p: Promise<unknown>): Promise<{ redirect?: string; result?: unknown }> {
  try {
    return { result: await p };
  } catch (err) {
    if (err instanceof Redirect) return { redirect: err.url };
    throw err;
  }
}

/** The code inside the last email handed to the fake Resend. */
function sentCode(): string {
  const init = fetchMock.mock.calls.at(-1)![1] as RequestInit;
  return /^(\d{6})$/m.exec(JSON.parse(init.body as string).text)![1];
}

/** An earlier, still-valid code for EMAIL. */
function addPreviousCode(code = "111111", createdAgoMs = 60_000) {
  const createdAt = new Date(Date.now() - createdAgoMs);
  fake.tables.otpCode.push({
    id: "previous",
    email: EMAIL,
    codeHash: hashCode(EMAIL, code, PEPPER),
    ipHash: null,
    used: false,
    attempts: 0,
    createdAt,
    expiresAt: new Date(createdAt.getTime() + OTP_TTL_MS),
  });
}

async function verify(code: string) {
  jar.set("es_otp_email", EMAIL);
  const fd = new FormData();
  fd.set("code", code);
  return outcome(verifyOtp({}, fd));
}

describe("success", () => {
  test("sends the code, sets the pending cookie and redirects; the sent code logs in", async () => {
    const res = await outcome(requestOtp({}, form()));
    expect(res.redirect).toBe("/login/verify");
    expect(jar.get("es_otp_email")).toBe(EMAIL);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fake.tables.otpCode).toHaveLength(1);

    expect((await verify(sentCode())).redirect).toBe("/dashboard");
  });

  test("older unused codes are invalidated after the send, newer ones are kept", async () => {
    addPreviousCode();
    // A concurrent request's row that is newer than this one.
    fake.tables.otpCode.push({
      id: "newer",
      email: EMAIL,
      codeHash: "h",
      ipHash: null,
      used: false,
      attempts: 0,
      createdAt: new Date(Date.now() + 60_000),
      expiresAt: new Date(Date.now() + 60_000 + OTP_TTL_MS),
    });

    await outcome(requestOtp({}, form()));
    const byId = Object.fromEntries(fake.tables.otpCode.map((r) => [r.id, r]));
    expect(byId.previous.used).toBe(true);
    expect(byId.newer.used).toBe(false);
  });

  test("older codes are still valid while the email is being sent", async () => {
    addPreviousCode();
    let usedDuringSend: unknown;
    fetchMock.mockImplementation(async () => {
      usedDuringSend = fake.tables.otpCode.find((r) => r.id === "previous")!.used;
      return new Response(null, { status: 200 });
    });
    await outcome(requestOtp({}, form()));
    expect(usedDuringSend).toBe(false);
  });
});

type FailureCase = [name: string, setup: () => void, log: unknown[]];

const failures: FailureCase[] = [
  ["HTTP 422", () => fetchMock.mockResolvedValue(new Response(`{"to":"${EMAIL}"}`, { status: 422 })), ["http", 422]],
  ["HTTP 500", () => fetchMock.mockResolvedValue(new Response("oops", { status: 500 })), ["http", 500]],
  ["network error", () => fetchMock.mockRejectedValue(new TypeError(`fetch failed ${EMAIL} ${KEY}`)), ["network"]],
  ["missing RESEND_API_KEY", () => vi.stubEnv("RESEND_API_KEY", undefined), ["config", "RESEND_API_KEY"]],
  ["missing EMAIL_FROM", () => vi.stubEnv("EMAIL_FROM", undefined), ["config", "EMAIL_FROM"]],
];

describe.each(failures)("failure: %s", (_name, setup, log) => {
  test("shows the Bengali message, no redirect, no pending cookie, the row is gone", async () => {
    setup();
    const res = await outcome(requestOtp({}, form()));
    expect(res).toEqual({ result: { error: SEND_FAILED } });
    expect(jar.has("es_otp_email")).toBe(false);
    expect(fake.tables.otpCode).toHaveLength(0);
    expect(errorSpy).toHaveBeenCalledExactlyOnceWith("[otp] delivery failed:", ...log);
  });

  test("failed sends do not count toward the rate limit", async () => {
    setup();
    for (let i = 0; i < EMAIL_LIMIT.max + 2; i++) {
      expect(await outcome(requestOtp({}, form()))).toEqual({ result: { error: SEND_FAILED } });
    }
    // Fix the cause: the next request is not rate-limited.
    vi.stubEnv("RESEND_API_KEY", KEY);
    vi.stubEnv("EMAIL_FROM", FROM);
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
    expect((await outcome(requestOtp({}, form()))).redirect).toBe("/login/verify");
  });

  test("the previous code keeps working", async () => {
    addPreviousCode("111111");
    setup();
    await outcome(requestOtp({}, form()));
    expect(fake.tables.otpCode.map((r) => [r.id, r.used])).toEqual([["previous", false]]);
    expect((await verify("111111")).redirect).toBe("/dashboard");
  });

  test("logs never contain the API key, email or code", async () => {
    // Capture the code if the send gets that far, then let the case's failure apply.
    let code: string | undefined;
    setup();
    const failing = fetchMock.getMockImplementation();
    fetchMock.mockImplementation(async (url: string, init: RequestInit) => {
      code = /^(\d{6})$/m.exec(JSON.parse(init.body as string).text)?.[1];
      return failing!(url, init);
    });
    await outcome(requestOtp({}, form()));
    const logged = JSON.stringify(errorSpy.mock.calls);
    expect(logged).not.toContain(KEY);
    expect(logged).not.toContain(EMAIL);
    expect(logged).not.toContain("re_");
    if (code) expect(logged).not.toContain(code);
  });
});

describe("failure: timeout", () => {
  test("after 10 seconds: Bengali message, no redirect, row gone, safe log", async () => {
    addPreviousCode("111111");
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    let started!: () => void;
    const fetchStarted = new Promise<void>((r) => (started = r));
    fetchMock.mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal!.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
          started();
        }),
    );

    const pending = outcome(requestOtp({}, form()));
    await fetchStarted;
    await vi.advanceTimersByTimeAsync(RESEND_TIMEOUT_MS);

    expect(await pending).toEqual({ result: { error: SEND_FAILED } });
    expect(jar.has("es_otp_email")).toBe(false);
    expect(fake.tables.otpCode.map((r) => [r.id, r.used])).toEqual([["previous", false]]);
    expect(errorSpy).toHaveBeenCalledExactlyOnceWith("[otp] delivery failed:", "timeout");
  });
});

describe("database trouble around the send", () => {
  test("if deleting the unsent row fails, the user still gets the message and nothing secret is logged", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 500 }));
    vi.spyOn(fake.db.otpCode, "deleteMany").mockRejectedValue(new Error(`db down ${EMAIL}`));
    expect(await outcome(requestOtp({}, form()))).toEqual({ result: { error: SEND_FAILED } });
    expect(errorSpy.mock.calls).toEqual([
      ["[otp] delivery failed:", "http", 500],
      ["[otp] delivery failed:", "delete_failed"],
    ]);
  });

  test("if invalidating older codes fails after a successful send, login still continues", async () => {
    vi.spyOn(fake.db.otpCode, "updateMany").mockRejectedValue(new Error(`db down ${EMAIL}`));
    expect((await outcome(requestOtp({}, form()))).redirect).toBe("/login/verify");
    expect(errorSpy).toHaveBeenCalledExactlyOnceWith("[otp] invalidate failed:", "db_error");
  });
});
