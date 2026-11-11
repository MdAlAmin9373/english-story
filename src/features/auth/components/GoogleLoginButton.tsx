"use client";

import { useFormStatus } from "react-dom";
import { startGoogleLogin } from "../google/actions";

// A POST form (server action), never a GET link, so prefetching can't start a login.
export function GoogleLoginButton({ next }: { next: string }) {
  return (
    <form action={startGoogleLogin}>
      <input type="hidden" name="next" value={next} />
      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex min-h-11 w-full items-center justify-center rounded-lg border border-line-strong bg-surface px-4 py-2 font-semibold text-ink hover:bg-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Google-এ যাওয়া হচ্ছে…" : "Google দিয়ে লগইন করুন"}
    </button>
  );
}
