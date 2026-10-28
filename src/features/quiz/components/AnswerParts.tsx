import { attemptLabel, pointsGainedLabel, scoreLabel } from "@/features/progress/labels";
import { MAX_POINTS } from "@/features/progress/progress";
import type { AnswerState } from "./use-answer";

export function OptionList({
  options,
  chosen,
  result,
  pending,
  onChoose,
}: {
  options: string[];
  chosen: number | null;
  result: AnswerState | null;
  pending: boolean;
  onChoose: (index: number) => void;
}) {
  const solved = result?.correct === true;

  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {options.map((option, i) => {
        let tone = "border-navy-700 hover:border-accent";
        if (result?.correct && i === result.correctIndex) tone = "border-emerald-400 bg-emerald-400/10";
        else if (result && !result.correct && i === chosen) tone = "border-red-400 bg-red-400/10";
        else if (i === chosen) tone = "border-accent";

        return (
          <li key={i}>
            <button
              type="button"
              lang="en"
              onClick={() => onChoose(i)}
              disabled={solved || pending}
              aria-pressed={i === chosen}
              className={`min-h-11 w-full rounded-lg border px-4 py-2 text-left text-ink transition-colors disabled:cursor-default ${tone}`}
            >
              {option}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

// Shared by question cards and the ordering game.
export type Feedback =
  | { correct: true; points: number; restored: boolean }
  | { correct: false; attempt: number };

export function AnswerFeedback({
  result,
  retryHint,
  error,
  pending,
}: {
  result: Feedback | null;
  retryHint: string;
  error: string | null;
  pending?: boolean;
}) {
  return (
    <div role="status" aria-live="polite" className="min-h-6 text-sm">
      {pending && <p className="text-ink-muted">যাচাই হচ্ছে…</p>}
      {error && <p className="text-red-300">{error}</p>}
      {!pending && result?.correct && (
        <p className="font-semibold text-emerald-300">
          {result.restored
            ? `✓ সমাধান হয়েছে · ${scoreLabel(result.points, MAX_POINTS)}`
            : `✓ সঠিক · ${pointsGainedLabel(result.points)}`}
        </p>
      )}
      {!pending && result && !result.correct && (
        <p>
          <span className="font-semibold text-red-300">✗ ভুল · {attemptLabel(result.attempt)}</span>
          <span className="text-ink-muted"> — {retryHint}</span>
        </p>
      )}
    </div>
  );
}
