import Link from "next/link";
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
  const { completed, correctCount } = await getUserProgress(userId);

  return (
    <section aria-labelledby="progress" className="flex w-full flex-col gap-4">
      <h2 id="progress" className="text-xl font-bold text-ink">
        আপনার অগ্রগতি
      </h2>

      <dl className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-navy-800 bg-navy-900 p-4">
          <dt className="text-sm text-ink-muted">সম্পন্ন অধ্যায়</dt>
          <dd className="text-2xl font-bold text-accent">{toBnDigits(completed.length)}</dd>
        </div>
        <div className="rounded-xl border border-navy-800 bg-navy-900 p-4">
          <dt className="text-sm text-ink-muted">সঠিক উত্তর</dt>
          <dd className="text-2xl font-bold text-accent">{toBnDigits(correctCount)}</dd>
        </div>
      </dl>

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
