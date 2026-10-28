"use client";

import { ProgressBar } from "@/components/ProgressBar";
import { scoreLabel } from "@/features/progress/labels";
import { toBnDigits } from "@/features/stories/labels";
import { useQuizProgress } from "./QuizProgress";

// Top-of-chapter summary; reads the same live state as the quiz, so both always agree.
export function ChapterScoreCard({ position, total }: { position: number; total: number }) {
  const { questions, tasks, points, maxPoints, firstTry } = useQuizProgress();
  const items = questions.total + tasks.total;
  const solved = questions.solved + tasks.solved;

  return (
    <section
      aria-label="অধ্যায়ের স্কোর"
      className="flex flex-col gap-3 rounded-xl border border-navy-800 bg-navy-900 p-4"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-sm text-accent">
          অধ্যায় {toBnDigits(position)} / {toBnDigits(total)}
        </p>
        <p className="font-semibold text-ink">স্কোর: {scoreLabel(points, maxPoints)}</p>
      </div>

      {items === 0 ? (
        <p className="text-sm text-ink-muted">এই অধ্যায়ে কোনো অনুশীলন নেই।</p>
      ) : (
        <>
          <ProgressBar
            value={solved}
            max={items}
            label="অনুশীলনের অগ্রগতি"
            valueText={`${scoreLabel(solved, items)} সঠিক`}
          />
          <dl className="grid gap-1 text-sm sm:grid-cols-2">
            <div className="flex flex-wrap gap-x-1">
              <dt className="text-ink-muted">সঠিক:</dt>
              <dd className="text-ink">
                {scoreLabel(solved, items)}
                <span className="text-ink-muted">
                  {" "}
                  (প্রশ্ন {scoreLabel(questions.solved, questions.total)} · বাক্য সাজানো{" "}
                  {scoreLabel(tasks.solved, tasks.total)})
                </span>
              </dd>
            </div>
            <div className="flex flex-wrap gap-x-1 sm:justify-end">
              <dt className="text-ink-muted">প্রথম চেষ্টায় সঠিক:</dt>
              <dd className="text-ink">{scoreLabel(firstTry, items)}</dd>
            </div>
          </dl>
        </>
      )}
    </section>
  );
}
