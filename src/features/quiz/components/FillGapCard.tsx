"use client";

import { toBnDigits } from "@/features/stories/labels";
import { AnswerFeedback, OptionList } from "./AnswerParts";
import { useAnswer, type SolvedQuestion } from "./use-answer";

const BLANK = "___";

export function FillGapCard({
  number,
  questionId,
  promptBn,
  promptEn,
  options,
  solved,
}: {
  number: number;
  questionId: string;
  promptBn: string;
  promptEn: string; // contains "___" where the word goes
  options: string[];
  solved: SolvedQuestion | null;
}) {
  const { chosen, result, error, pending, choose } = useAnswer(questionId, solved);
  const [before, ...rest] = promptEn.split(BLANK);
  const after = rest.join(BLANK);
  const filled = result?.correct
    ? options[result.correctIndex]
    : chosen !== null
      ? options[chosen]
      : null;

  return (
    <article className="flex flex-col gap-3 rounded-xl border border-navy-800 bg-navy-900 p-4">
      <header className="flex flex-col gap-1">
        <p className="text-xs text-accent">প্রশ্ন {toBnDigits(number)} · শূন্যস্থান পূরণ করুন</p>
        <p className="text-ink-muted">{promptBn}</p>
        <p lang="en" className="text-lg text-ink">
          {before}
          <span
            className={`mx-1 inline-block min-w-16 border-b-2 px-1 text-center ${
              result ? (result.correct ? "border-emerald-400" : "border-red-400") : "border-accent"
            }`}
          >
            {filled ?? <span className="sr-only">শূন্যস্থান</span>}
          </span>
          {after}
        </p>
      </header>
      <OptionList
        options={options}
        chosen={chosen}
        result={result}
        pending={pending}
        onChoose={choose}
      />
      <AnswerFeedback
        result={result}
        retryHint="অন্য একটি শব্দ বেছে আবার চেষ্টা করুন"
        error={error}
        pending={pending}
      />
    </article>
  );
}
