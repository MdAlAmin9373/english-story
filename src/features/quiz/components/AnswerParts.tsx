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
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {options.map((option, i) => {
        let tone = "border-navy-700 hover:border-accent";
        if (result && i === result.correctIndex) tone = "border-emerald-400 bg-emerald-400/10";
        else if (result && i === chosen) tone = "border-red-400 bg-red-400/10";
        else if (i === chosen) tone = "border-accent";

        return (
          <li key={i}>
            <button
              type="button"
              lang="en"
              onClick={() => onChoose(i)}
              disabled={result !== null || pending}
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

export function AnswerFeedback({
  result,
  answer,
  error,
  pending,
}: {
  result: { correct: boolean } | null;
  answer: string | null;
  error: string | null;
  pending?: boolean;
}) {
  return (
    <div role="status" aria-live="polite" className="min-h-6 text-sm">
      {pending && <p className="text-ink-muted">যাচাই হচ্ছে…</p>}
      {error && <p className="text-red-300">{error}</p>}
      {result?.correct && <p className="font-semibold text-emerald-300">✓ ঠিক আছে!</p>}
      {result && !result.correct && (
        <p>
          <span className="font-semibold text-red-300">✗ ভুল হয়েছে</span>
          {answer && (
            <span className="text-ink-muted">
              {" "}
              — সঠিক উত্তর:{" "}
              <span lang="en" className="text-ink">
                {answer}
              </span>
            </span>
          )}
        </p>
      )}
    </div>
  );
}
