import Link from "next/link";
import { logout } from "@/features/auth/actions";
import { getCurrentUser } from "@/features/auth/session";

// Reads the session cookie and database: render it inside a <Suspense> boundary.
export async function HeaderAuth() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <Link
        href="/login"
        className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-navy-950 hover:opacity-90"
      >
        লগইন
      </Link>
    );
  }

  return (
    <form action={logout}>
      <button
        type="submit"
        className="rounded-lg border border-navy-700 px-3 py-1.5 text-sm text-ink hover:border-accent"
      >
        লগআউট
      </button>
    </form>
  );
}
