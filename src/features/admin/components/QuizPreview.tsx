import type { QuestionType } from "@prisma/client";
import { seededShuffle, tokenize } from "@/features/quiz/check";
import { toBnDigits } from "@/features/stories/labels";

// Read-only look at a chapter's practice, for the admin preview. It has no
// buttons or server actions, so it can never record attempts or progress.
const instruction: Record<QuestionType, string> = {
  MULTIPLE_CHOICE: "সঠিক উত্তর বাছুন",
  FILL_GAP: "শূন্যস্থান পূরণ করুন",
};

export function QuizPreview({
  questions,
  orderTasks,
}: {
  questions: {
    id: string;
    type: QuestionType;
    promptBn: string;
    promptEn: string;
    options: string[];
    correctIndex: number;
  }[];
  orderTasks: { id: string; promptBn: string; en: string }[];
}) {
  if (questions.length === 0 && orderTasks.length === 0) return null;

  return (
    <section aria-labelledby="chapter-quiz" className="flex flex-col gap-4 pt-4">
      <h2 id="chapter-quiz" className="text-xl font-bold text-ink">
        অনুশীলন
      </h2>

      {questions.length > 0 && (
        <ol className="flex flex-col gap-3">
          {questions.map((q, i) => (
            <li key={q.id}>
              <article className="flex flex-col gap-3 rounded-xl border border-navy-800 bg-navy-900 p-4">
                <header className="flex flex-col gap-1">
                  <p className="text-xs text-accent">
                    প্রশ্ন {toBnDigits(i + 1)} · {instruction[q.type]}
                  </p>
                  <p className="text-ink">{q.promptBn}</p>
                  <p lang="en" className="text-ink-muted">
                    {q.promptEn}
                  </p>
                </header>
                <ul className="flex flex-col gap-2">
                  {q.options.map((option, j) => (
                    <li
                      key={j}
                      lang="en"
                      className={
                        j === q.correctIndex
                          ? "rounded-lg border border-emerald-400/60 bg-emerald-400/10 px-3 py-2 text-ink"
                          : "rounded-lg border border-navy-700 px-3 py-2 text-ink"
                      }
                    >
                      {option}
                      {j === q.correctIndex && (
                        <span lang="bn" className="ml-2 text-sm text-emerald-300">
                          ✓ সঠিক উত্তর
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </article>
            </li>
          ))}
        </ol>
      )}

      {orderTasks.length > 0 && (
        <ul className="flex flex-col gap-3">
          {orderTasks.map((t) => (
            <li key={t.id}>
              <article className="flex flex-col gap-3 rounded-xl border border-navy-800 bg-navy-900 p-4">
                <header className="flex flex-col gap-1">
                  <p className="text-xs text-accent">শব্দ সাজিয়ে বাক্য বানান</p>
                  <p className="text-ink">{t.promptBn}</p>
                </header>
                {/* Same seeded order the reader gets. */}
                <div lang="en" className="flex flex-wrap gap-2">
                  {seededShuffle(tokenize(t.en), t.id).map((token, j) => (
                    <span key={j} className="rounded-lg border border-navy-700 px-3 py-1.5 text-ink">
                      {token}
                    </span>
                  ))}
                </div>
                <p className="text-sm text-emerald-300">
                  ✓ সঠিক বাক্য: <span lang="en">{t.en}</span>
                </p>
              </article>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
