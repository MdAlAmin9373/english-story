import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { VerifyForm } from "@/features/auth/components/VerifyForm";
import { getPendingEmail } from "@/features/auth/session";

export const metadata: Metadata = { title: "কোড যাচাই — English Story" };

export default function VerifyPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-16">
      <h1 className="text-2xl font-bold text-ink">কোড যাচাই</h1>
      <Suspense fallback={<p className="text-ink-muted">লোড হচ্ছে…</p>}>
        <VerifyPanel />
      </Suspense>
    </main>
  );
}

function maskEmail(email: string): string {
  const [name, domain] = email.split("@");
  return `${name.slice(0, 2)}${"•".repeat(Math.max(name.length - 2, 1))}@${domain}`;
}

// Reads a cookie, so it streams in behind the Suspense boundary.
async function VerifyPanel() {
  const email = await getPendingEmail();
  if (!email) redirect("/login");

  return (
    <>
      <p className="text-ink-muted">
        <span dir="ltr" className="text-ink">
          {maskEmail(email)}
        </span>{" "}
        ঠিকানায় পাঠানো কোডটি লিখুন। কোডটি ১০ মিনিট পর্যন্ত কাজ করবে।
      </p>
      <VerifyForm />
      <Link href="/login" className="text-sm text-accent underline">
        নতুন কোড নিন বা অন্য ইমেইল ব্যবহার করুন
      </Link>
    </>
  );
}
