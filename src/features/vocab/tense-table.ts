import type { TenseKind, TenseTime } from "@prisma/client";

// Rows and columns of the tense table, in display order (no perfect continuous).
export const tenseTimes = ["PRESENT", "PAST", "FUTURE"] as const satisfies readonly TenseTime[];
export const tenseKinds = ["SIMPLE", "CONTINUOUS", "PERFECT"] as const satisfies readonly TenseKind[];

export const tenseTimeLabel: Record<TenseTime, { bn: string; en: string }> = {
  PRESENT: { bn: "বর্তমান", en: "Present" },
  PAST: { bn: "অতীত", en: "Past" },
  FUTURE: { bn: "ভবিষ্যৎ", en: "Future" },
};

export const tenseKindLabel: Record<TenseKind, { bn: string; en: string }> = {
  SIMPLE: { bn: "সাধারণ", en: "Simple" },
  CONTINUOUS: { bn: "ঘটমান", en: "Continuous" },
  PERFECT: { bn: "পুরাঘটিত", en: "Perfect" },
};

export const labelSeparator = " · ";

// "বর্তমান · Present": Bengali first, then the English term.
export function bilingualLabel({ bn, en }: { bn: string; en: string }): string {
  return `${bn}${labelSeparator}${en}`;
}

export type TenseFormInput = {
  kind: TenseKind;
  time: TenseTime;
  form: string;
  exampleEn: string;
};

export type TenseCell = { form: string; exampleEn: string } | null;

export type TenseRow = {
  time: TenseTime;
  cells: TenseCell[]; // same order as tenseKinds
};

// Places each form in its (time, kind) cell; missing cells are null.
// If a cell appears twice, the first form wins.
export function buildTenseTable(forms: readonly TenseFormInput[]): TenseRow[] {
  const byCell = new Map<string, TenseCell>();
  for (const { time, kind, form, exampleEn } of forms) {
    const key = `${time}:${kind}`;
    if (!byCell.has(key)) byCell.set(key, { form, exampleEn });
  }

  return tenseTimes.map((time) => ({
    time,
    cells: tenseKinds.map((kind) => byCell.get(`${time}:${kind}`) ?? null),
  }));
}
