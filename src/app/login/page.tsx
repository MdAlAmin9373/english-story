import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/features/auth/components/LoginForm";
import { safeNextPath } from "@/features/auth/next-path";

export const metadata: Metadata = { title: "লগইন — English Story" };

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-16">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-ink">লগইন</h1>
        <p className="text-ink-muted">
          আপনার ইমেইলে একটি ৬ সংখ্যার কোড পাঠানো হবে।
        </p>
      </div>
      <Suspense fallback={<p className="text-ink-muted">লোড হচ্ছে…</p>}>
        <LoginPanel searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

// Reads searchParams, so it streams in behind the Suspense boundary.
async function LoginPanel({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { next } = await searchParams;
  return <LoginForm next={safeNextPath(next)} />;
}
