"use client";

import { useState, useTransition } from "react";
import { remainingLabel } from "@/features/progress/labels";
import { completeChapter } from "../actions";
import { useQuizProgress } from "./QuizProgress";

// Enabled once every item is solved; completeChapter re-checks this on the server.
export function CompleteChapterButton({
  chapterId,
  completed,
}: {
  chapterId: string;
  completed: boolean;
}) {
  const [done, setDone] = useState(completed);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const progress = useQuizProgress();

  if (done) {
    return (
      <p role="status" className="font-semibold text-emerald-300">
        ✓ অধ্যায় সম্পন্ন হয়েছে
      </p>
    );
  }

  function complete() {
    setError(null);
    startTransition(async () => {
      const res = await completeChapter({ chapterId });
      if (res.ok) setDone(true);
      else setError(res.error);
    });
  }

  const reason = progress.done ? null : remainingLabel(progress);

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={complete}
        disabled={pending || !progress.done}
        aria-describedby={reason ? "complete-reason" : undefined}
        className="min-h-11 rounded-lg bg-accent px-5 py-2 font-semibold text-navy-950 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "সংরক্ষণ হচ্ছে…" : "অধ্যায় শেষ"}
      </button>
      {reason && (
        <p id="complete-reason" className="text-sm text-ink-muted">
          {reason} — শেষ করতে সবগুলো সঠিক করুন।
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
