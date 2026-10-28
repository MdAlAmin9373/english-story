"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { toBnDigits } from "@/features/stories/labels";

type Progress = {
  questions: { total: number; solved: number };
  tasks: { total: number; solved: number };
  done: boolean;
  markQuestion: (id: string) => void;
  markTask: (id: string) => void;
};

const ProgressContext = createContext<Progress | null>(null);

// Live solved counts for the chapter's practice, seeded from stored attempts on the server.
// Display only: completeChapter re-checks everything on the server.
export function QuizProgressProvider({
  questionTotal,
  taskTotal,
  solvedQuestionIds,
  solvedTaskIds,
  children,
}: {
  questionTotal: number;
  taskTotal: number;
  solvedQuestionIds: string[];
  solvedTaskIds: string[];
  children: ReactNode;
}) {
  const [questions, setQuestions] = useState(() => new Set(solvedQuestionIds));
  const [tasks, setTasks] = useState(() => new Set(solvedTaskIds));

  const markQuestion = useCallback(
    (id: string) => setQuestions((s) => (s.has(id) ? s : new Set(s).add(id))),
    [],
  );
  const markTask = useCallback(
    (id: string) => setTasks((s) => (s.has(id) ? s : new Set(s).add(id))),
    [],
  );

  const value = useMemo<Progress>(
    () => ({
      questions: { total: questionTotal, solved: questions.size },
      tasks: { total: taskTotal, solved: tasks.size },
      done: questions.size >= questionTotal && tasks.size >= taskTotal,
      markQuestion,
      markTask,
    }),
    [questionTotal, taskTotal, questions, tasks, markQuestion, markTask],
  );

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useQuizProgress(): Progress {
  const value = useContext(ProgressContext);
  if (!value) throw new Error("useQuizProgress must be used inside QuizProgressProvider");
  return value;
}

// "প্রশ্ন x/y সঠিক · বাক্য সাজানো a/b"
export function QuizProgressLine() {
  const { questions, tasks } = useQuizProgress();
  const parts = [
    questions.total > 0 &&
      `প্রশ্ন ${toBnDigits(questions.solved)}/${toBnDigits(questions.total)} সঠিক`,
    tasks.total > 0 && `বাক্য সাজানো ${toBnDigits(tasks.solved)}/${toBnDigits(tasks.total)}`,
  ].filter(Boolean);
  if (parts.length === 0) return null;

  return (
    <p aria-live="polite" className="text-sm text-ink-muted">
      {parts.join(" · ")}
    </p>
  );
}
