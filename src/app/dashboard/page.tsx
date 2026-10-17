import type { Metadata } from "next";
import { Suspense } from "react";
import { logout } from "@/features/auth/actions";
import { requireUser } from "@/features/auth/session";
import { ProgressSummary } from "@/features/quiz/components/ProgressSummary";

export const metadata: Metadata = { title: "ড্যাশবোর্ড — English Story" };

export default function DashboardPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-16 sm:px-6">
      <h1 className="text-2xl font-bold text-ink">ড্যাশবোর্ড</h1>
      <Suspense fallback={<p className="text-ink-muted">লোড হচ্ছে…</p>}>
        <DashboardPanel />
      </Suspense>
    </main>
  );
}

// Reads the session cookie and database, so it streams in behind Suspense.
async function DashboardPanel() {
  const user = await requireUser();

  return (
    <section className="flex flex-col items-start gap-4">
      <p className="text-ink-muted">
        আপনি লগইন করেছেন:{" "}
        <span dir="ltr" className="text-ink">
          {user.email}
        </span>
      </p>
      <Suspense fallback={<p className="text-ink-muted">অগ্রগতি লোড হচ্ছে…</p>}>
        <ProgressSummary userId={user.id} />
      </Suspense>
      <form action={logout}>
        <button
          type="submit"
          className="rounded-lg border border-navy-700 px-4 py-2 text-ink hover:border-accent"
        >
          লগআউট
        </button>
      </form>
    </section>
  );
}
