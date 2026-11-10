"use client";

import { useState, useTransition } from "react";
import { revealHint } from "../actions";
import { HintBox } from "./HintBox";

const MSG = {
  button: "💡 ইঙ্গিত দেখুন",
  loading: "লোড হচ্ছে…",
  penalty: "ইঙ্গিত দেখলে এই প্রশ্নে সর্বোচ্চ ১ নম্বর পাবেন।",
  failed: "ইঙ্গিত আনা যায়নি। আবার চেষ্টা করুন।",
} as const;

// The hint text is not on the page until the reader asks for it: the server action records
// the use (points capped at 1) and only then returns the text. After a reload, a hint this
// reader already opened arrives as initialHint.
export function HintPanel({
  kind,
  id,
  hasHint,
  initialHint,
  solved,
}: {
  kind: "question" | "task";
  id: string;
  hasHint: boolean;
  initialHint: string | null;
  solved: boolean;
}) {
  const [hint, setHint] = useState(initialHint);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!hasHint) return null;

  function show() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await revealHint({ kind, id });
        if (res.ok) setHint(res.hint);
        else setError(res.error);
      } catch {
        setError(MSG.failed);
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {!hint && !solved && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <button
            type="button"
            onClick={show}
            disabled={pending}
            className="min-h-11 rounded-lg border border-line-strong px-4 py-2 text-ink hover:border-accent disabled:opacity-50"
          >
            {pending ? MSG.loading : MSG.button}
          </button>
          <p className="text-sm text-ink-muted">{MSG.penalty}</p>
        </div>
      )}
      {/* Always mounted, so the box (or an error) is announced when it appears. */}
      <div aria-live="polite">
        {hint ? <HintBox hint={hint} /> : error && <p className="text-sm text-danger">{error}</p>}
      </div>
    </div>
  );
}
