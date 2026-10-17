"use client";

import { useActionState } from "react";
import { verifyOtp, type AuthFormState } from "../actions";

const initialState: AuthFormState = {};

export function VerifyForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(verifyOtp, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="next" value={next} />
      <label htmlFor="code" className="text-sm text-ink-muted">
        ৬ সংখ্যার কোড
      </label>
      <input
        id="code"
        name="code"
        type="text"
        required
        autoComplete="one-time-code"
        inputMode="numeric"
        maxLength={7}
        placeholder="123456"
        aria-invalid={state.error ? true : undefined}
        aria-describedby={state.error ? "code-error" : undefined}
        className="rounded-lg border border-navy-700 bg-navy-900 px-4 py-2 text-center text-xl tracking-[0.4em] text-ink outline-none focus:border-accent"
      />
      {state.error && (
        <p id="code-error" role="alert" className="text-sm text-red-300">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-accent px-4 py-2 font-semibold text-navy-950 disabled:opacity-60"
      >
        {pending ? "যাচাই হচ্ছে…" : "লগইন করুন"}
      </button>
    </form>
  );
}
