"use client";

import { useRef, useState, useTransition, type PointerEvent } from "react";
import { checkOrder } from "../actions";
import { tokenize } from "../check";
import { AnswerFeedback, type Feedback } from "./AnswerParts";
import { useQuizProgress } from "./QuizProgress";

type Zone = "answer" | "bank";
type Drag = { index: number; startX: number; startY: number; dx: number; dy: number; moved: boolean };
export type SolvedTask = { answer: string; points: number };

// Movement (px) before a press counts as a drag instead of a tap.
const DRAG_THRESHOLD = 6;

// For a task solved earlier: put the shuffled chips back in the answer's order.
function placeInOrder(tokens: string[], answer: string): number[] {
  const free = tokens.map((_, i) => i);
  const out: number[] = [];
  for (const word of tokenize(answer)) {
    const at = free.findIndex((i) => tokens[i] === word);
    if (at === -1) return [];
    out.push(free[at]);
    free.splice(at, 1);
  }
  return free.length === 0 ? out : [];
}

// Words are chips: drag them with mouse or touch (Pointer Events), or tap/press Enter to move.
// After a wrong check the user rearranges and checks again (unlimited retries).
export function SentenceOrderGame({
  taskId,
  promptBn,
  tokens,
  solved,
}: {
  taskId: string;
  promptBn: string;
  tokens: string[];
  solved: SolvedTask | null;
}) {
  // token indexes in the answer row
  const [placed, setPlaced] = useState<number[]>(() =>
    solved ? placeInOrder(tokens, solved.answer) : [],
  );
  const [drag, setDrag] = useState<Drag | null>(null);
  const [result, setResult] = useState<Feedback | null>(
    solved ? { correct: true, points: solved.points, restored: true } : null,
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { markTask } = useQuizProgress();

  const answerRef = useRef<HTMLDivElement>(null);
  const bankRef = useRef<HTMLDivElement>(null);
  const chipRefs = useRef(new Map<number, HTMLButtonElement>());
  const suppressClick = useRef(false);

  const isSolved = result?.correct === true;
  const locked = isSolved || pending;
  const bank = tokens.map((_, i) => i).filter((i) => !placed.includes(i));

  // Any change after a wrong check clears the red state, ready for the next try.
  function edit(update: (p: number[]) => number[]) {
    setPlaced(update);
    if (result && !result.correct) setResult(null);
  }

  function toggle(index: number) {
    edit((p) => (p.includes(index) ? p.filter((i) => i !== index) : [...p, index]));
  }

  function inside(el: HTMLElement | null, x: number, y: number) {
    const r = el?.getBoundingClientRect();
    return !!r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  }

  // Insert before the first answer chip that sits after the pointer (reading order).
  function insertionIndex(order: number[], x: number, y: number) {
    for (let pos = 0; pos < order.length; pos++) {
      const r = chipRefs.current.get(order[pos])?.getBoundingClientRect();
      if (!r) continue;
      if (y < r.top || (y <= r.bottom && x < r.left + r.width / 2)) return pos;
    }
    return order.length;
  }

  function drop(index: number, x: number, y: number) {
    if (inside(answerRef.current, x, y)) {
      edit((p) => {
        const rest = p.filter((i) => i !== index);
        const at = insertionIndex(rest, x, y);
        return [...rest.slice(0, at), index, ...rest.slice(at)];
      });
    } else if (inside(bankRef.current, x, y)) {
      edit((p) => p.filter((i) => i !== index));
    }
  }

  function onPointerDown(e: PointerEvent<HTMLButtonElement>, index: number) {
    if (locked || (e.pointerType === "mouse" && e.button !== 0)) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({ index, startX: e.clientX, startY: e.clientY, dx: 0, dy: 0, moved: false });
  }

  function onPointerMove(e: PointerEvent<HTMLButtonElement>) {
    if (!drag) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    const moved = drag.moved || Math.hypot(dx, dy) > DRAG_THRESHOLD;
    setDrag({ ...drag, dx, dy, moved });
  }

  function onPointerUp(e: PointerEvent<HTMLButtonElement>) {
    if (!drag) return;
    if (drag.moved) {
      suppressClick.current = true; // the click that follows a drag is not a tap
      drop(drag.index, e.clientX, e.clientY);
    }
    setDrag(null);
  }

  function onClick(index: number) {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    if (!locked) toggle(index);
  }

  function check() {
    setError(null);
    startTransition(async () => {
      const res = await checkOrder({ taskId, tokens: placed.map((i) => tokens[i]) });
      if (!res.ok) {
        setError(res.error);
      } else if (res.correct) {
        setResult({ correct: true, points: res.points, restored: false });
        markTask(taskId, res.points);
      } else {
        setResult({ correct: false, attempt: res.attempt });
      }
    });
  }

  function chip(index: number, zone: Zone) {
    const dragging = drag?.index === index && drag.moved;
    const tone =
      zone === "answer" && result
        ? result.correct
          ? "border-emerald-400 bg-emerald-400/10"
          : "border-red-400 bg-red-400/10"
        : zone === "answer"
          ? "border-accent bg-navy-800"
          : "border-navy-700 bg-navy-900 hover:border-accent";

    return (
      <button
        key={index}
        type="button"
        lang="en"
        ref={(el) => {
          if (zone !== "answer") return;
          if (el) chipRefs.current.set(index, el);
          else chipRefs.current.delete(index);
        }}
        onPointerDown={(e) => onPointerDown(e, index)}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => setDrag(null)}
        onClick={() => onClick(index)}
        disabled={locked}
        aria-label={`${tokens[index]} — ${zone === "answer" ? "সরিয়ে দিন" : "যোগ করুন"}`}
        style={dragging ? { transform: `translate(${drag.dx}px, ${drag.dy}px)` } : undefined}
        className={`min-h-11 touch-none select-none rounded-lg border px-3 py-1.5 text-ink disabled:cursor-default ${tone} ${
          dragging ? "relative z-10 cursor-grabbing opacity-90 shadow-lg shadow-black/40" : "cursor-grab"
        }`}
      >
        {tokens[index]}
      </button>
    );
  }

  return (
    <article className="flex flex-col gap-3 rounded-xl border border-navy-800 bg-navy-900 p-4">
      <header className="flex flex-col gap-1">
        <p className="text-xs text-accent">শব্দ সাজিয়ে বাক্য বানান</p>
        <p className="text-ink">{promptBn}</p>
      </header>

      <div
        ref={answerRef}
        aria-label="আপনার বাক্য"
        className="flex min-h-16 flex-wrap items-center gap-2 rounded-lg border-2 border-dashed border-navy-700 bg-navy-950 p-2"
      >
        {placed.length === 0 && (
          <span className="px-1 text-sm text-ink-muted">শব্দগুলো এখানে টেনে আনুন বা ট্যাপ করুন</span>
        )}
        {placed.map((i) => chip(i, "answer"))}
      </div>

      <div ref={bankRef} aria-label="শব্দের ঘর" className="flex min-h-14 flex-wrap gap-2 p-1">
        {bank.map((i) => chip(i, "bank"))}
      </div>

      {!isSolved && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={check}
            disabled={pending || bank.length > 0 || result !== null}
            className="min-h-11 rounded-lg bg-accent px-4 py-2 font-semibold text-navy-950 disabled:opacity-50"
          >
            যাচাই করুন
          </button>
          <button
            type="button"
            onClick={() => edit(() => [])}
            disabled={pending || placed.length === 0}
            className="min-h-11 rounded-lg border border-navy-700 px-4 py-2 text-ink hover:border-accent disabled:opacity-50"
          >
            সব সরান
          </button>
        </div>
      )}

      <AnswerFeedback
        result={result}
        retryHint="শব্দগুলো সরিয়ে আবার সাজান, তারপর যাচাই করুন"
        error={error}
        pending={pending}
      />
    </article>
  );
}
