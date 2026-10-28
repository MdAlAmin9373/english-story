"use client";

import { toBnDigits } from "@/features/stories/labels";
import { AnswerFeedback, OptionList } from "./AnswerParts";
import { useAnswer, type SolvedQuestion } from "./use-answer";

export function ChoiceCard({
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
  promptEn: string;
  options: string[];
  solved: SolvedQuestion | null;
}) {
  const { chosen, result, error, pending, choose } = useAnswer(questionId, solved);

  return (
    <article className="flex flex-col gap-3 rounded-xl border border-navy-800 bg-navy-900 p-4">
      <header className="flex flex-col gap-1">
        <p className="text-xs text-accent">প্রশ্ন {toBnDigits(number)} · সঠিক উত্তর বাছুন</p>
        <p className="text-ink">{promptBn}</p>
        <p lang="en" className="text-ink-muted">
          {promptEn}
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
        retryHint="অন্য একটি উত্তর বেছে আবার চেষ্টা করুন"
        error={error}
        pending={pending}
      />
    </article>
  );
}
