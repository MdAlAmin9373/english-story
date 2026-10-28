"use client";

import { useState, useTransition } from "react";
import { submitAnswer } from "../actions";
import { useQuizProgress } from "./QuizProgress";

// correctIndex is known only after a correct answer (or for a question solved earlier).
export type AnswerState =
  | { correct: true; correctIndex: number; points: number; restored: boolean }
  | { correct: false; attempt: number };

export type SolvedQuestion = { correctIndex: number; points: number };

// The server checks every answer. After a wrong answer the user simply picks again
// (unlimited retries); after a correct one the question is locked.
export function useAnswer(questionId: string, solved: SolvedQuestion | null) {
  const [chosen, setChosen] = useState<number | null>(solved?.correctIndex ?? null);
  const [result, setResult] = useState<AnswerState | null>(
    solved ? { correct: true, ...solved, restored: true } : null,
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { markQuestion } = useQuizProgress();

  function choose(index: number) {
    if (result?.correct || pending) return;
    setChosen(index);
    setResult(null);
    setError(null);
    startTransition(async () => {
      const res = await submitAnswer({ questionId, chosenIndex: index });
      if (!res.ok) {
        setError(res.error);
        setChosen(null);
      } else if (res.correct) {
        setResult({ correct: true, correctIndex: res.correctIndex, points: res.points, restored: false });
        markQuestion(questionId);
      } else {
        setResult({ correct: false, attempt: res.attempt });
      }
    });
  }

  return { chosen, result, error, pending, choose };
}
