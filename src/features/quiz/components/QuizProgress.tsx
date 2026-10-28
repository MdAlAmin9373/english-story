"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { MAX_POINTS } from "@/features/progress/progress";
import { toBnDigits } from "@/features/stories/labels";

type Count = { total: number; solved: number };
type Progress = {
  questions: Count;
  tasks: Count;
  done: boolean;
  points: number;
  maxPoints: number;
  firstTry: number;
  markQuestion: (id: string, points: number) => void;
  markTask: (id: string, points: number) => void;
};

const ProgressContext = createContext<Progress | null>(null);

// Points per solved item (id → points). Seeded from stored attempts on the server and
// updated only with points returned by the server actions. Display only: completeChapter
// re-checks everything on the server.
type Solved = Record<string, number>;

function add(prev: Solved, id: string, points: number): Solved {
  return id in prev ? prev : { ...prev, [id]: points };
}

// Wraps the chapter's score card and its quiz, so both always show the same numbers.
export function QuizProgressProvider({
  questionTotal,
  taskTotal,
  solvedQuestions,
  solvedTasks,
  children,
}: {
  questionTotal: number;
  taskTotal: number;
  solvedQuestions: Solved;
  solvedTasks: Solved;
  children: ReactNode;
}) {
  const [questions, setQuestions] = useState(solvedQuestions);
  const [tasks, setTasks] = useState(solvedTasks);

  const markQuestion = useCallback(
    (id: string, points: number) => setQuestions((s) => add(s, id, points)),
    [],
  );
  const markTask = useCallback(
    (id: string, points: number) => setTasks((s) => add(s, id, points)),
    [],
  );

  const value = useMemo<Progress>(() => {
    const all = [...Object.values(questions), ...Object.values(tasks)];
    const q = Object.keys(questions).length;
    const t = Object.keys(tasks).length;
    return {
      questions: { total: questionTotal, solved: q },
      tasks: { total: taskTotal, solved: t },
      done: q >= questionTotal && t >= taskTotal,
      points: all.reduce((sum, p) => sum + p, 0),
      maxPoints: (questionTotal + taskTotal) * MAX_POINTS,
      // Only a first-attempt solve earns full points.
      firstTry: all.filter((p) => p === MAX_POINTS).length,
      markQuestion,
      markTask,
    };
  }, [questionTotal, taskTotal, questions, tasks, markQuestion, markTask]);

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
