// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { fake, type Row } from "./helpers/fake-db";

// after() is captured so tests can run the scheduled callbacks explicitly.
const afterQueue = vi.hoisted(() => [] as Array<() => unknown>);
const afterImpl = vi.hoisted(() => ({
  fn: (cb: () => unknown) => {
    afterQueue.push(cb);
  },
}));

const jar = vi.hoisted(() => new Map<string, string>());
const delivered = vi.hoisted(() => [] as Array<{ email: string; code: string }>);
const Redirect = vi.hoisted(
  () =>
    class Redirect extends Error {
      constructor(public url: string) {
        super("NEXT_REDIRECT");
      }
    },
);

vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({ after: (cb: () => unknown) => afterImpl.fn(cb) }));
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
vi.mock("@/lib/env", () => ({
  serverEnv: () => ({ OTP_PEPPER: PEPPER, OTP_DELIVERY: "console" }),
}));
vi.mock("@/features/auth/delivery", () => ({
  deliverOtp: async (email: string, code: string) => {
    delivered.push({ email, code });
  },
}));

const PEPPER = "test-pepper-that-is-at-least-32-characters";

const cleanup = await import("@/features/auth/cleanup");
const { EMAIL_LIMIT, IP_LIMIT } = await import("@/features/auth/rate-limit");
const { OTP_TTL_MS, hashCode } = await import("@/features/auth/otp");
const { requestOtp, verifyOtp } = await import("@/features/auth/actions");
const { createSession } = await import("@/features/auth/session");

const {
  CLEANUP_BATCH_SIZE,
  CLEANUP_MIN_INTERVAL_MS,
  OTP_RETENTION_MS,
  SESSION_GRACE_MS,
  cleanupExpiredSessions,
  cleanupOldOtpCodes,
  otpCleanupCutoff,
  resetCleanupThrottle,
  scheduleCleanup,
  sessionCleanupCutoff,
} = cleanup;

const NOW = new Date("2026-11-12T12:00:00Z");
const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const ago = (ms: number) => new Date(NOW.getTime() - ms);

function otpRow(id: string, createdAgoMs: number, ttlMs = OTP_TTL_MS): Row {
  const createdAt = ago(createdAgoMs);
  return {
    id,
    email: "learner@example.com",
    codeHash: "h",
    ipHash: "ip",
    used: true,
    attempts: 0,
    createdAt,
    expiresAt: new Date(createdAt.getTime() + ttlMs),
  };
}

function sessionRow(id: string, expiresAgoMs: number): Row {
  return {
    id,
    userId: "u1",
    tokenHash: `t-${id}`,
    createdAt: ago(expiresAgoMs + 30 * DAY),
    expiresAt: ago(expiresAgoMs),
  };
}

const ids = (table: string) => fake.tables[table].map((r) => r.id).sort();

async function runAfterQueue(): Promise<void> {
  while (afterQueue.length) await afterQueue.shift()!();
}

function formData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

async function redirectOf(p: Promise<unknown>): Promise<string> {
  try {
    await p;
  } catch (err) {
    if (err instanceof Redirect) return err.url;
    throw err;
  }
  throw new Error("expected a redirect");
}

let errorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  fake.reset();
  afterQueue.length = 0;
  afterImpl.fn = (cb) => {
    afterQueue.push(cb);
  };
  jar.clear();
  delivered.length = 0;
  resetCleanupThrottle();
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("retention constants", () => {
  test("OTP retention is longer than every rate-limit window and the OTP lifetime", () => {
    expect(OTP_RETENTION_MS).toBe(DAY);
    expect(OTP_RETENTION_MS).toBeGreaterThan(EMAIL_LIMIT.windowMs);
    expect(OTP_RETENTION_MS).toBeGreaterThan(IP_LIMIT.windowMs);
    expect(OTP_RETENTION_MS).toBeGreaterThan(OTP_TTL_MS);
  });

  test("cutoffs", () => {
    expect(SESSION_GRACE_MS).toBe(7 * DAY);
    expect(otpCleanupCutoff(NOW)).toEqual(ago(DAY));
    expect(sessionCleanupCutoff(NOW)).toEqual(ago(7 * DAY));
  });
});

describe("cleanupOldOtpCodes", () => {
  test("deletes OTP rows older than 1 day and keeps younger ones", async () => {
    fake.tables.otpCode.push(
      otpRow("old-2d", 2 * DAY),
      otpRow("old-25h", 25 * HOUR),
      otpRow("young-23h59m", DAY - MIN),
      otpRow("young-1h", HOUR),
      otpRow("fresh", 0),
    );
    expect(await cleanupOldOtpCodes(NOW)).toBe(2);
    expect(ids("otpCode")).toEqual(["fresh", "young-1h", "young-23h59m"]);
  });

  test("keeps a row created exactly at the cutoff", async () => {
    // expiresAt is past the cutoff here, but createdAt is not strictly older.
    fake.tables.otpCode.push(otpRow("edge", DAY, -1));
    expect(await cleanupOldOtpCodes(NOW)).toBe(0);
    expect(ids("otpCode")).toEqual(["edge"]);
  });

  test("never deletes a row younger than 1 day even if it has a very short lifetime", async () => {
    fake.tables.otpCode.push(otpRow("young-odd-ttl", HOUR, -2 * DAY));
    expect(await cleanupOldOtpCodes(NOW)).toBe(0);
    expect(ids("otpCode")).toEqual(["young-odd-ttl"]);
  });

  test("respects the batch limit", async () => {
    for (let i = 0; i < 250; i++) fake.tables.otpCode.push(otpRow(`o${i}`, 2 * DAY + i * MIN));
    const findMany = vi.spyOn(fake.db.otpCode, "findMany");

    expect(await cleanupOldOtpCodes(NOW)).toBe(CLEANUP_BATCH_SIZE);
    expect(findMany.mock.calls[0][0]).toMatchObject({ take: 200 });
    expect(fake.tables.otpCode).toHaveLength(50);

    expect(await cleanupOldOtpCodes(NOW)).toBe(50);
    expect(fake.tables.otpCode).toHaveLength(0);
  });

  test("the delete re-checks the age condition", async () => {
    fake.tables.otpCode.push(otpRow("a", 2 * DAY), otpRow("b", 2 * DAY));
    const original = fake.db.otpCode.findMany;
    vi.spyOn(fake.db.otpCode, "findMany").mockImplementation(async (args) => {
      const result = await original(args);
      // Between the select and the delete, row "b" becomes young.
      const b = fake.tables.otpCode.find((r) => r.id === "b")!;
      b.createdAt = ago(HOUR);
      b.expiresAt = ago(HOUR - OTP_TTL_MS);
      return result;
    });

    expect(await cleanupOldOtpCodes(NOW)).toBe(1);
    expect(ids("otpCode")).toEqual(["b"]);
  });

  test("does not issue a delete when nothing is old", async () => {
    fake.tables.otpCode.push(otpRow("young", HOUR));
    const deleteMany = vi.spyOn(fake.db.otpCode, "deleteMany");
    expect(await cleanupOldOtpCodes(NOW)).toBe(0);
    expect(deleteMany).not.toHaveBeenCalled();
  });
});

describe("cleanupExpiredSessions", () => {
  test("deletes sessions expired more than 7 days ago and keeps the rest", async () => {
    fake.tables.session.push(
      sessionRow("expired-30d", 30 * DAY),
      sessionRow("expired-8d", 8 * DAY),
      sessionRow("expired-6d23h", 7 * DAY - HOUR),
      sessionRow("expired-exactly-7d", 7 * DAY),
      sessionRow("expired-1m", MIN),
      sessionRow("valid", -10 * DAY),
    );
    expect(await cleanupExpiredSessions(NOW)).toBe(2);
    expect(ids("session")).toEqual([
      "expired-1m",
      "expired-6d23h",
      "expired-exactly-7d",
      "valid",
    ]);
  });

  test("respects the batch limit", async () => {
    for (let i = 0; i < 250; i++) fake.tables.session.push(sessionRow(`s${i}`, 8 * DAY + i * MIN));
    fake.tables.session.push(sessionRow("valid", -DAY));
    const findMany = vi.spyOn(fake.db.session, "findMany");

    expect(await cleanupExpiredSessions(NOW)).toBe(200);
    expect(findMany.mock.calls[0][0]).toMatchObject({ take: 200 });
    expect(await cleanupExpiredSessions(NOW)).toBe(50);
    expect(ids("session")).toEqual(["valid"]);
  });
});

describe("scheduleCleanup", () => {
  test("runs through after() and is throttled per kind for 5 minutes", async () => {
    const t = NOW.getTime();
    scheduleCleanup("otp", t);
    scheduleCleanup("otp", t + CLEANUP_MIN_INTERVAL_MS - 1);
    scheduleCleanup("session", t + 1);
    expect(afterQueue).toHaveLength(2);

    scheduleCleanup("otp", t + CLEANUP_MIN_INTERVAL_MS);
    expect(afterQueue).toHaveLength(3);
  });

  test("a database error is caught and logs only the kind and Prisma code", async () => {
    vi.spyOn(fake.db.otpCode, "findMany").mockRejectedValue(
      Object.assign(new Error("learner@example.com tokenHash abc123"), { code: "P1001" }),
    );
    scheduleCleanup("otp");
    await expect(runAfterQueue()).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalledExactlyOnceWith("[cleanup] failed:", "otp", "P1001");
  });

  test("a non-Prisma error logs only the kind", async () => {
    vi.spyOn(fake.db.session, "findMany").mockRejectedValue(new Error("secret detail"));
    scheduleCleanup("session");
    await runAfterQueue();
    expect(errorSpy).toHaveBeenCalledExactlyOnceWith("[cleanup] failed:", "session");
  });

  test("an after() failure is caught", () => {
    afterImpl.fn = () => {
      throw new Error("outside request scope");
    };
    expect(() => scheduleCleanup("session")).not.toThrow();
    expect(errorSpy).toHaveBeenCalledExactlyOnceWith("[cleanup] failed:", "session");
  });
});

describe("integration with OTP request and login", () => {
  test("requestOtp schedules OTP cleanup and still redirects when cleanup fails", async () => {
    fake.tables.otpCode.push(otpRow("old", 2 * DAY));
    vi.spyOn(fake.db.otpCode, "deleteMany").mockRejectedValue(new Error("boom"));

    const url = await redirectOf(requestOtp({}, formData({ email: "Learner@Example.com" })));
    expect(url).toBe("/login/verify");
    expect(delivered).toHaveLength(1);
    expect(afterQueue).toHaveLength(1);

    await runAfterQueue();
    expect(errorSpy).toHaveBeenCalledExactlyOnceWith("[cleanup] failed:", "otp");
  });

  test("requestOtp cleanup removes old rows but keeps the new code", async () => {
    fake.tables.otpCode.push(otpRow("old", 2 * DAY));
    await redirectOf(requestOtp({}, formData({ email: "learner@example.com" })));
    await runAfterQueue();
    expect(fake.tables.otpCode).toHaveLength(1);
    expect(fake.tables.otpCode[0].id).not.toBe("old");
  });

  test("createSession still sets the cookie when cleanup fails", async () => {
    vi.spyOn(fake.db.session, "findMany").mockRejectedValue(new Error("boom"));
    await createSession("u1");
    expect(jar.has("es_session")).toBe(true);
    expect(fake.tables.session).toHaveLength(1);
    await expect(runAfterQueue()).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalledExactlyOnceWith("[cleanup] failed:", "session");
  });

  test("createSession still works when after() throws", async () => {
    afterImpl.fn = () => {
      throw new Error("outside request scope");
    };
    await expect(createSession("u1")).resolves.toBeUndefined();
    expect(jar.has("es_session")).toBe(true);
  });

  test("OTP login succeeds when session cleanup fails", async () => {
    const email = "learner@example.com";
    await fake.db.otpCode.create({
      data: {
        email,
        codeHash: hashCode(email, "123456", PEPPER),
        expiresAt: new Date(Date.now() + OTP_TTL_MS),
        ipHash: null,
      },
    });
    jar.set("es_otp_email", email);
    vi.spyOn(fake.db.session, "deleteMany").mockRejectedValue(new Error("boom"));
    fake.tables.session.push(sessionRow("old", 30 * DAY));

    const url = await redirectOf(verifyOtp({}, formData({ code: "123456" })));
    expect(url).toBe("/dashboard");
    expect(jar.has("es_session")).toBe(true);
    await runAfterQueue();
    expect(errorSpy).toHaveBeenCalledExactlyOnceWith("[cleanup] failed:", "session");
  });

  test("verifyOtp ignores expired codes without counting an attempt", async () => {
    const email = "learner@example.com";
    fake.tables.otpCode.push({
      ...otpRow("expired", 20 * MIN),
      email,
      used: false,
      codeHash: hashCode(email, "123456", PEPPER),
      createdAt: new Date(Date.now() - 20 * MIN),
      expiresAt: new Date(Date.now() - 10 * MIN),
    });
    jar.set("es_otp_email", email);

    const result = await verifyOtp({}, formData({ code: "123456" }));
    expect(result).toEqual({ error: "কোডটির মেয়াদ শেষ হয়ে গেছে। নতুন কোড নিন।" });
    expect(fake.tables.otpCode[0].attempts).toBe(0);
    expect(jar.has("es_session")).toBe(false);
  });

  test("logs never contain emails, hashes or tokens", async () => {
    vi.spyOn(fake.db.otpCode, "findMany").mockRejectedValue(new Error("learner@example.com"));
    await redirectOf(requestOtp({}, formData({ email: "learner@example.com" })));
    await runAfterQueue();
    const logged = JSON.stringify(errorSpy.mock.calls);
    expect(logged).not.toContain("learner@example.com");
    expect(logged).not.toMatch(/[0-9a-f]{32,}/);
  });
});
