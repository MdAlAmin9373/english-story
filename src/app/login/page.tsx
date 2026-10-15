import type { Metadata } from "next";
import { LoginForm } from "@/features/auth/components/LoginForm";

export const metadata: Metadata = { title: "লগইন — English Story" };

export default function LoginPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-16">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-ink">লগইন</h1>
        <p className="text-ink-muted">
          আপনার ইমেইলে একটি ৬ সংখ্যার কোড পাঠানো হবে।
        </p>
      </div>
      <LoginForm />
    </main>
  );
}
