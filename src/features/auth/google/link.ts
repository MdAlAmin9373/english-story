import "server-only";
import { db } from "@/lib/db";

export type LinkResult =
  | { ok: true; userId: string }
  | { ok: false; code: "google_conflict" | "google_failed"; category: string };

const conflict = (category: string): LinkResult => ({
  ok: false,
  code: "google_conflict",
  category,
});

function isUniqueViolation(err: unknown): boolean {
  return (err as { code?: unknown } | null)?.code === "P2002";
}

// Finds or creates the user for a verified Google identity. Only googleSub is
// ever written; role is never read or changed here.
export async function linkGoogleUser({
  sub,
  email,
}: {
  sub: string;
  email: string;
}): Promise<LinkResult> {
  const [bySub, byEmail] = await Promise.all([
    db.user.findUnique({ where: { googleSub: sub }, select: { id: true } }),
    db.user.findUnique({ where: { email }, select: { id: true, googleSub: true } }),
  ]);

  // The sub belongs to another user, or its user's email no longer matches
  // (changed Google email): refuse rather than log in by sub.
  if (bySub && bySub.id !== byEmail?.id) return conflict("sub_linked_elsewhere");

  if (byEmail) {
    if (byEmail.googleSub === sub) return { ok: true, userId: byEmail.id };
    if (byEmail.googleSub !== null) return conflict("email_has_other_sub");

    // Conditional write: a concurrent link of another sub loses here.
    try {
      const linked = await db.user.updateMany({
        where: { id: byEmail.id, googleSub: null },
        data: { googleSub: sub },
      });
      if (linked.count !== 1) return conflict("link_race");
    } catch (err) {
      if (isUniqueViolation(err)) return conflict("link_race");
      throw err;
    }
    return { ok: true, userId: byEmail.id };
  }

  try {
    const user = await db.user.create({
      data: { email, googleSub: sub },
      select: { id: true },
    });
    return { ok: true, userId: user.id };
  } catch (err) {
    if (isUniqueViolation(err)) return { ok: false, code: "google_failed", category: "create_race" };
    throw err;
  }
}
