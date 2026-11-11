// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from "vitest";

const db = vi.hoisted(() => ({
  user: { findUnique: vi.fn(), updateMany: vi.fn(), create: vi.fn() },
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ db }));

const { linkGoogleUser } = await import("@/features/auth/google/link");

const SUB = "google-sub-1";
const EMAIL = "learner@example.com";

// findUnique is called twice: first by googleSub, then by email.
function users(bySub: unknown, byEmail: unknown) {
  db.user.findUnique.mockImplementation(({ where }: { where: Record<string, string> }) =>
    Promise.resolve("googleSub" in where ? bySub : byEmail),
  );
}

const uniqueError = () => Object.assign(new Error("Unique constraint failed"), { code: "P2002" });

function allWrittenData(): unknown[] {
  return [...db.user.updateMany.mock.calls, ...db.user.create.mock.calls].map(
    ([args]) => (args as { data: unknown }).data,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  db.user.updateMany.mockResolvedValue({ count: 1 });
  db.user.create.mockResolvedValue({ id: "new-user" });
});

describe("linkGoogleUser", () => {
  test("new user: created with email and googleSub only", async () => {
    users(null, null);
    expect(await linkGoogleUser({ sub: SUB, email: EMAIL })).toEqual({
      ok: true,
      userId: "new-user",
    });
    expect(db.user.create).toHaveBeenCalledWith({
      data: { email: EMAIL, googleSub: SUB },
      select: { id: true },
    });
  });

  test("existing OTP user: linked with a conditional update", async () => {
    users(null, { id: "u1", googleSub: null });
    expect(await linkGoogleUser({ sub: SUB, email: EMAIL })).toEqual({ ok: true, userId: "u1" });
    expect(db.user.updateMany).toHaveBeenCalledWith({
      where: { id: "u1", googleSub: null },
      data: { googleSub: SUB },
    });
    expect(db.user.create).not.toHaveBeenCalled();
  });

  test("already linked to this sub: logs in, no writes", async () => {
    users({ id: "u1" }, { id: "u1", googleSub: SUB });
    expect(await linkGoogleUser({ sub: SUB, email: EMAIL })).toEqual({ ok: true, userId: "u1" });
    expect(allWrittenData()).toEqual([]);
  });

  test("conflict: the email's user has a different Google sub", async () => {
    users(null, { id: "u1", googleSub: "other-sub" });
    expect(await linkGoogleUser({ sub: SUB, email: EMAIL })).toMatchObject({
      ok: false,
      code: "google_conflict",
    });
    expect(allWrittenData()).toEqual([]);
  });

  test("conflict: this sub is linked to a different user", async () => {
    users({ id: "u2" }, { id: "u1", googleSub: null });
    expect(await linkGoogleUser({ sub: SUB, email: EMAIL })).toMatchObject({
      ok: false,
      code: "google_conflict",
    });
    expect(allWrittenData()).toEqual([]);
  });

  test("changed Google email with no user for it: refused, not logged in by sub", async () => {
    users({ id: "u2" }, null);
    expect(await linkGoogleUser({ sub: SUB, email: EMAIL })).toMatchObject({
      ok: false,
      code: "google_conflict",
    });
    expect(db.user.create).not.toHaveBeenCalled();
  });

  test("race: someone linked first (count 0) → conflict", async () => {
    users(null, { id: "u1", googleSub: null });
    db.user.updateMany.mockResolvedValue({ count: 0 });
    expect(await linkGoogleUser({ sub: SUB, email: EMAIL })).toMatchObject({
      code: "google_conflict",
    });
  });

  test("race: sub linked to another user meanwhile (P2002 on update) → conflict", async () => {
    users(null, { id: "u1", googleSub: null });
    db.user.updateMany.mockRejectedValue(uniqueError());
    expect(await linkGoogleUser({ sub: SUB, email: EMAIL })).toMatchObject({
      code: "google_conflict",
    });
  });

  test("race: user created meanwhile (P2002 on create) → google_failed", async () => {
    users(null, null);
    db.user.create.mockRejectedValue(uniqueError());
    expect(await linkGoogleUser({ sub: SUB, email: EMAIL })).toMatchObject({
      ok: false,
      code: "google_failed",
    });
  });

  test("other database errors are not swallowed", async () => {
    users(null, null);
    db.user.create.mockRejectedValue(new Error("connection lost"));
    await expect(linkGoogleUser({ sub: SUB, email: EMAIL })).rejects.toThrow("connection lost");
  });

  test("role is never read or written (an admin stays admin)", async () => {
    users(null, { id: "admin-1", googleSub: null });
    await linkGoogleUser({ sub: SUB, email: EMAIL });
    users(null, null);
    await linkGoogleUser({ sub: SUB, email: EMAIL });

    for (const data of allWrittenData()) expect(data).not.toHaveProperty("role");
    for (const [args] of db.user.findUnique.mock.calls) {
      expect((args as { select: object }).select).not.toHaveProperty("role");
    }
  });
});
