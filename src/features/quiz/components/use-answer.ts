"use client";

import { useState, useTransition } from "react";
import { submitAnswer } from "../actions";

export type AnswerState = { correct: boolean; correctIndex: number };

// One answer per question: the server checks it and only then reveals correctIndex.
export function useAnswer(questionId: string) {
  const [chosen, setChosen] = useState<number | null>(null);
  const [result, setResult] = useState<AnswerState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function choose(index: number) {
    if (result || pending) return;
    setChosen(index);
    setError(null);
    startTransition(async () => {
      const res = await submitAnswer({ questionId, chosenIndex: index });
      if (res.ok) {
        setResult({ correct: res.correct, correctIndex: res.correctIndex });
      } else {
        setError(res.error);
        setChosen(null);
      }
    });
  }

  return { chosen, result, error, pending, choose };
}
