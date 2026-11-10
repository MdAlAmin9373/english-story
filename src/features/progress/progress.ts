// Pure course-progress rules, no server imports, so they can be unit tested.
// Attempt lists must be sorted oldest first (createdAt asc).

export const POINTS = { first: 5, second: 2, later: 1 } as const;
export const MAX_POINTS = POINTS.first;
// A hint seen before the first correct answer caps that item's points.
export const HINT_CAP = 1;

export type Attempt = { itemId: string; correct: boolean };
export type ItemSummary = { attempts: number; firstCorrect: number | null };
export type ChapterItems = { questionIds: readonly string[]; taskIds: readonly string[] };
export type Score = { points: number; max: number; firstTry: number; items: number };
// Item ids with a hint-use record for this user. Hints are recorded only while an item is
// unsolved, so membership means "hint used before the first correct answer".
export type HintUses = { questions: ReadonlySet<string>; tasks: ReadonlySet<string> };

export const NO_HINTS: HintUses = { questions: new Set(), tasks: new Set() };

function pointsForAttempt(firstCorrect: number | null): number {
  if (firstCorrect === null) return 0;
  if (firstCorrect === 1) return POINTS.first;
  if (firstCorrect === 2) return POINTS.second;
  return POINTS.later;
}

// THE scoring rule; every score on the site comes from here. Points come from the attempt
// number (1-based) of the first correct attempt only: 5 / 2 / 1 (3rd or later) / 0 (never).
// With a hint the points are capped at 1, so any correct answer gives 1 and never gives 0.
export function itemScore(firstCorrect: number | null, hintUsed: boolean): number {
  const points = pointsForAttempt(firstCorrect);
  return hintUsed ? Math.min(points, HINT_CAP) : points;
}

export function itemPoints(attempts: readonly { correct: boolean }[], hintUsed = false): number {
  const index = attempts.findIndex((a) => a.correct);
  return itemScore(index === -1 ? null : index + 1, hintUsed);
}

// Attempt count and first-correct attempt number per item; later attempts never undo a solve.
export function summarizeAttempts(attempts: readonly Attempt[]): Map<string, ItemSummary> {
  const out = new Map<string, ItemSummary>();
  for (const { itemId, correct } of attempts) {
    const s = out.get(itemId) ?? { attempts: 0, firstCorrect: null };
    s.attempts += 1;
    if (correct && s.firstCorrect === null) s.firstCorrect = s.attempts;
    out.set(itemId, s);
  }
  return out;
}

export type Summary = ReadonlyMap<string, ItemSummary>;

function solvedCount(ids: readonly string[], summary: Summary): number {
  return ids.filter((id) => summary.get(id)?.firstCorrect != null).length;
}

// Summaries come from summarizeAttempts, built once per attempt list and shared by chapters.
// A chapter with nothing to solve is done.
export function chapterRequirements(items: ChapterItems, quiz: Summary, order: Summary) {
  const questions = { total: items.questionIds.length, solved: solvedCount(items.questionIds, quiz) };
  const tasks = { total: items.taskIds.length, solved: solvedCount(items.taskIds, order) };
  return {
    questions,
    tasks,
    done: questions.solved === questions.total && tasks.solved === tasks.total,
  };
}

export type ChapterRequirements = ReturnType<typeof chapterRequirements>;

// Without hint uses (the default) this is exactly the score before hints existed.
// firstTry counts full-point items: first try without a hint (same rule as the live client).
export function chapterScore(
  items: ChapterItems,
  quiz: Summary,
  order: Summary,
  hints: HintUses = NO_HINTS,
): Score {
  const points = [
    ...scoreIds(items.questionIds, quiz, hints.questions),
    ...scoreIds(items.taskIds, order, hints.tasks),
  ];
  return {
    points: points.reduce((sum, p) => sum + p, 0),
    max: points.length * MAX_POINTS,
    firstTry: points.filter((p) => p === MAX_POINTS).length,
    items: points.length,
  };
}

function scoreIds(ids: readonly string[], summary: Summary, hinted: ReadonlySet<string>) {
  return ids.map((id) => itemScore(summary.get(id)?.firstCorrect ?? null, hinted.has(id)));
}

// Points per solved item (id → points), to seed the live client state.
export function solvedPoints(
  ids: readonly string[],
  summary: Summary,
  hinted: ReadonlySet<string>,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const id of ids) {
    const first = summary.get(id)?.firstCorrect;
    if (first != null) out[id] = itemScore(first, hinted.has(id));
  }
  return out;
}

export function storyScore(scores: readonly Score[]): Score {
  return scores.reduce(
    (t, s) => ({
      points: t.points + s.points,
      max: t.max + s.max,
      firstTry: t.firstTry + s.firstTry,
      items: t.items + s.items,
    }),
    { points: 0, max: 0, firstTry: 0, items: 0 },
  );
}

export type LockStatus = { locked: false } | { locked: true; requiredOrder: number };

// Open when first, already completed, or the previous published chapter is completed.
// Orders may have gaps, so "previous" is the previous one in sorted order.
export function chapterLock(
  order: number,
  publishedOrders: readonly number[],
  completedOrders: readonly number[],
): LockStatus {
  const completed = new Set(completedOrders);
  if (completed.has(order)) return { locked: false };
  const prev = publishedOrders.filter((o) => o < order).sort((a, b) => b - a)[0];
  if (prev === undefined || completed.has(prev)) return { locked: false };
  return { locked: true, requiredOrder: prev };
}

export type StoryProgress = {
  completed: number;
  total: number;
  percent: number;
  nextOrder: number | null; // first chapter not yet completed; null when all are done
};

export function storyProgress(
  publishedOrders: readonly number[],
  completedOrders: readonly number[],
): StoryProgress {
  const completed = new Set(completedOrders);
  const sorted = [...publishedOrders].sort((a, b) => a - b);
  const done = sorted.filter((o) => completed.has(o)).length;
  return {
    completed: done,
    total: sorted.length,
    percent: sorted.length === 0 ? 0 : Math.round((done / sorted.length) * 100),
    nextOrder: sorted.find((o) => !completed.has(o)) ?? null,
  };
}

// The unfinished story with the most recent activity (completion or attempt), if any.
export function pickResume<T extends { lastActivity: Date | null; progress: StoryProgress }>(
  stories: readonly T[],
): T | null {
  let best: T | null = null;
  for (const s of stories) {
    if (!s.lastActivity || s.progress.nextOrder === null) continue;
    if (!best || s.lastActivity > (best.lastActivity as Date)) best = s;
  }
  return best;
}
