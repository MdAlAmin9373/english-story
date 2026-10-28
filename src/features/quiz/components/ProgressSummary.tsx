import Link from "next/link";
import { ProgressBar } from "@/components/ProgressBar";
import { scoreLabel } from "@/features/progress/labels";
import { pickResume } from "@/features/progress/progress";
import { getAllStoriesProgress } from "@/features/progress/queries";
import { toBnDigits } from "@/features/stories/labels";
import { getUserProgress } from "../queries";

const dateFormat = new Intl.DateTimeFormat("bn-BD", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Asia/Dhaka",
});

// Reads the database: render inside <Suspense> for a logged-in user.
export async function ProgressSummary({ userId }: { userId: string }) {
  const [{ completed, correctCount }, stories] = await Promise.all([
    getUserProgress(userId),
    getAllStoriesProgress(userId),
  ]);
  const resume = pickResume(stories);
  const resumeChapter = resume?.chapters.find((c) => c.order === resume.progress.nextOrder);
  const started = stories.filter((s) => s.lastActivity !== null);
  const totalPoints = stories.reduce((sum, s) => sum + s.score.points, 0);

  return (
    <section aria-labelledby="progress" className="flex w-full flex-col gap-4">
      <h2 id="progress" className="text-xl font-bold text-ink">
        আপনার অগ্রগতি
      </h2>

      {resume && resumeChapter && (
        <Link
          href={`/stories/${resume.slug}/${resumeChapter.order}`}
          className="flex flex-col gap-2 rounded-xl border-2 border-accent bg-navy-900 p-4 hover:opacity-90"
        >
          <span className="text-sm text-accent">যেখান থেকে ছেড়েছিলেন</span>
          <span className="text-lg font-semibold text-ink">{resume.titleBn}</span>
          <span className="text-ink-muted">
            অধ্যায় {toBnDigits(resumeChapter.order)}: {resumeChapter.titleBn}
          </span>
          <span className="self-start rounded-lg bg-accent px-4 py-2 font-semibold text-navy-950">
            চালিয়ে যান →
          </span>
        </Link>
      )}

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-navy-800 bg-navy-900 p-4">
          <dt className="text-sm text-ink-muted">সম্পন্ন অধ্যায়</dt>
          <dd className="text-2xl font-bold text-accent">{toBnDigits(completed.length)}</dd>
        </div>
        <div className="rounded-xl border border-navy-800 bg-navy-900 p-4">
          <dt className="text-sm text-ink-muted">সঠিক উত্তর</dt>
          <dd className="text-2xl font-bold text-accent">{toBnDigits(correctCount)}</dd>
        </div>
        <div className="col-span-2 rounded-xl border border-navy-800 bg-navy-900 p-4 sm:col-span-1">
          <dt className="text-sm text-ink-muted">মোট পয়েন্ট</dt>
          <dd className="text-2xl font-bold text-accent">{toBnDigits(totalPoints)}</dd>
        </div>
      </dl>

      {started.length > 0 && (
        <section aria-labelledby="story-progress" className="flex flex-col gap-2">
          <h3 id="story-progress" className="font-semibold text-ink">
            গল্প অনুযায়ী
          </h3>
          <ul className="flex flex-col gap-2">
            {started.map((s) => (
              <li key={s.slug}>
                <Link
                  href={`/stories/${s.slug}`}
                  className="flex flex-col gap-2 rounded-xl border border-navy-800 bg-navy-900 p-4 hover:border-accent"
                >
                  <span className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <span className="text-ink">{s.titleBn}</span>
                    <span className="text-sm text-ink-muted">
                      {toBnDigits(s.progress.percent)}% · স্কোর {scoreLabel(s.score.points, s.score.max)}
                    </span>
                  </span>
                  <ProgressBar
                    value={s.progress.completed}
                    max={s.progress.total}
                    label={`${s.titleBn} — অগ্রগতি`}
                    valueText={`${scoreLabel(s.progress.completed, s.progress.total)} অধ্যায় শেষ`}
                  />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {completed.length > 0 && (
        <h3 className="font-semibold text-ink">সম্পন্ন অধ্যায়সমূহ</h3>
      )}

      {completed.length === 0 ? (
        <p className="text-ink-muted">
          এখনও কোনো অধ্যায় শেষ হয়নি।{" "}
          <Link href="/stories" className="text-accent hover:underline">
            গল্প পড়া শুরু করুন →
          </Link>
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {completed.map(({ chapter, completedAt }) => (
            <li key={`${chapter.story.slug}/${chapter.order}`}>
              <Link
                href={`/stories/${chapter.story.slug}/${chapter.order}`}
                className="flex flex-col gap-0.5 rounded-xl border border-navy-800 bg-navy-900 p-4 hover:border-accent sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="text-ink">
                  {chapter.story.titleBn} · অধ্যায় {toBnDigits(chapter.order)}: {chapter.titleBn}
                </span>
                <span className="text-sm text-ink-muted">
                  ✓ {dateFormat.format(completedAt)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
