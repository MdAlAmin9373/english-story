"use client";

import { useState, useTransition } from "react";
import { completeChapter } from "../actions";

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

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={complete}
        disabled={pending}
        className="min-h-11 rounded-lg bg-accent px-5 py-2 font-semibold text-navy-950 disabled:opacity-60"
      >
        {pending ? "সংরক্ষণ হচ্ছে…" : "অধ্যায় শেষ"}
      </button>
      {error && (
        <p role="alert" className="text-sm text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
