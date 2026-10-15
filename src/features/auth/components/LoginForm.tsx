"use client";

import { useActionState } from "react";
import { requestOtp, type AuthFormState } from "../actions";

const initialState: AuthFormState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(requestOtp, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <label htmlFor="email" className="text-sm text-ink-muted">
        ইমেইল ঠিকানা
      </label>
      <input
        id="email"
        name="email"
        type="email"
        required
        autoComplete="email"
        inputMode="email"
        placeholder="you@example.com"
        aria-invalid={state.error ? true : undefined}
        aria-describedby={state.error ? "email-error" : undefined}
        className="rounded-lg border border-navy-700 bg-navy-900 px-4 py-2 text-ink outline-none focus:border-accent"
      />
      {state.error && (
        <p id="email-error" role="alert" className="text-sm text-red-300">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-accent px-4 py-2 font-semibold text-navy-950 disabled:opacity-60"
      >
        {pending ? "পাঠানো হচ্ছে…" : "কোড পাঠান"}
      </button>
    </form>
  );
}
