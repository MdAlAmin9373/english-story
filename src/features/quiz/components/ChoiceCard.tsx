"use client";

import { toBnDigits } from "@/features/stories/labels";
import { AnswerFeedback, OptionList } from "./AnswerParts";
import { HintPanel } from "./HintPanel";
import { useAnswer, type SolvedQuestion } from "./use-answer";

export function ChoiceCard({
  number,
  questionId,
  promptBn,
  promptEn,
  options,
  hasHint,
  hint,
  solved,
}: {
  number: number;
  questionId: string;
  promptBn: string;
  promptEn: string;
  options: string[];
  hasHint: boolean;
  hint: string | null; // only when this reader already revealed it
  solved: SolvedQuestion | null;
}) {
  const { chosen, result, error, pending, choose } = useAnswer(questionId, solved);

  return (
    <article className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4">
      <header className="flex flex-col gap-1">
        <p className="text-xs text-accent">প্রশ্ন {toBnDigits(number)} · সঠিক উত্তর বাছুন</p>
        <p className="text-ink">{promptBn}</p>
        <p lang="en" className="text-ink-muted">
          {promptEn}
        </p>
      </header>
      <HintPanel
        kind="question"
        id={questionId}
        hasHint={hasHint}
        initialHint={hint}
        solved={result?.correct === true}
      />
      <OptionList
        options={options}
        chosen={chosen}
        result={result}
        pending={pending}
        onChoose={choose}
      />
      <AnswerFeedback
        result={result}
        retryHint="অন্য একটি উত্তর বেছে আবার চেষ্টা করুন"
        error={error}
        pending={pending}
      />
    </article>
  );
}
