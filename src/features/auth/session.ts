import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { loginPathWithNext } from "./next-path";
import { emailSchema } from "./schemas";

const SESSION_COOKIE = "es_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const PENDING_EMAIL_COOKIE = "es_otp_email";
const PENDING_EMAIL_TTL_S = 10 * 60;

export type CurrentUser = { id: string; email: string; role: Role };

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

const baseCookie = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
} as const;

// Only callable from Server Actions / Route Handlers (sets a cookie).
export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await db.session.create({
    data: { userId, tokenHash: hashToken(token), expiresAt },
  });

  (await cookies()).set(SESSION_COOKIE, token, { ...baseCookie, expires: expiresAt });
}

// Reads a cookie and the database: call it inside a <Suspense> boundary.
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    select: {
      expiresAt: true,
      user: { select: { id: true, email: true, role: true } },
    },
  });
  if (!session || session.expiresAt.getTime() <= Date.now()) return null;

  return session.user;
}

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

// Every admin page and admin server action must call this; never trust the UI.
// Guests are sent to login; logged-in non-admins get a 404 so /admin stays hidden.
export async function requireAdmin(nextPath = "/admin"): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(loginPathWithNext(nextPath));
  if (user.role !== "ADMIN") notFound();
  return user;
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  }
  store.delete(SESSION_COOKIE);
}

export async function setPendingEmail(email: string): Promise<void> {
  (await cookies()).set(PENDING_EMAIL_COOKIE, email, {
    ...baseCookie,
    maxAge: PENDING_EMAIL_TTL_S,
  });
}

export async function getPendingEmail(): Promise<string | null> {
  const value = (await cookies()).get(PENDING_EMAIL_COOKIE)?.value;
  const parsed = emailSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export async function clearPendingEmail(): Promise<void> {
  (await cookies()).delete(PENDING_EMAIL_COOKIE);
}
