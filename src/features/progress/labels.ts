// Plain module (not "use client") so server and client components can share these labels.
import { toBnDigits } from "@/features/stories/labels";
import type { ChapterRequirements } from "./progress";

export function pointsGainedLabel(points: number): string {
  return `+${toBnDigits(points)}`;
}

export function scoreLabel(points: number, max: number): string {
  return `${toBnDigits(points)}/${toBnDigits(max)}`;
}

export function attemptLabel(attempt: number): string {
  return `চেষ্টা ${toBnDigits(attempt)}`;
}

// Why the complete button is still disabled, e.g. "আরও ৩টি প্রশ্ন ও ১টি বাক্য বাকি".
export function remainingLabel(req: Pick<ChapterRequirements, "questions" | "tasks">): string | null {
  const q = req.questions.total - req.questions.solved;
  const t = req.tasks.total - req.tasks.solved;
  const parts = [
    q > 0 ? `${toBnDigits(q)}টি প্রশ্ন` : null,
    t > 0 ? `${toBnDigits(t)}টি বাক্য` : null,
  ].filter(Boolean);
  return parts.length === 0 ? null : `আরও ${parts.join(" ও ")} বাকি`;
}
