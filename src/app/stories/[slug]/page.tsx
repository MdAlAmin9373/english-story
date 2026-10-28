import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ProgressBar } from "@/components/ProgressBar";
import { getCurrentUser } from "@/features/auth/session";
import { scoreLabel } from "@/features/progress/labels";
import { getStoryProgress, type StoryProgressDetail } from "@/features/progress/queries";
import { genreLabel, levelLabel, toBnDigits } from "@/features/stories/labels";
import { getStoryBySlug } from "@/features/stories/queries";

export const metadata: Metadata = { title: "গল্প — English Story" };

export default function StoryPage({ params }: PageProps<"/stories/[slug]">) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <Link href="/stories" className="text-sm text-ink-muted hover:text-accent">
        ← সব গল্প
      </Link>
      <Suspense fallback={<p className="text-ink-muted">লোড হচ্ছে…</p>}>
        <StoryDetails params={params} />
      </Suspense>
    </main>
  );
}

// Reads params, the session cookie and the database, so it streams in behind Suspense.
async function StoryDetails({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [story, user] = await Promise.all([getStoryBySlug(slug), getCurrentUser()]);
  if (!story) notFound();
  const progress = user ? await getStoryProgress(slug, user.id) : null;

  return (
    <>
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-ink">{story.titleBn}</h1>
        <p lang="en" className="text-ink-muted">
          {story.titleEn}
        </p>
        <p className="flex flex-wrap gap-2 text-xs text-accent">
          <span>{genreLabel[story.genre]}</span>
          <span>·</span>
          <span>{levelLabel(story.level)}</span>
        </p>
        <p className="text-ink">{story.summaryBn}</p>
        <p lang="en" className="text-sm text-ink-muted">
          {story.summaryEn}
        </p>
      </header>

      {progress ? (
        <CourseOutline story={progress} />
      ) : (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-ink">অধ্যায়সমূহ</h2>
          <ol className="flex flex-col gap-3">
            {story.chapters.map((chapter) => (
              <li key={chapter.order}>
                <Link
                  href={`/stories/${story.slug}/${chapter.order}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-navy-800 bg-navy-900 p-4 hover:border-accent"
                >
                  <span className="flex flex-col">
                    <span className="text-ink">
                      অধ্যায় {toBnDigits(chapter.order)}: {chapter.titleBn}
                    </span>
                    <span lang="en" className="text-sm text-ink-muted">
                      {chapter.titleEn}
                    </span>
                  </span>
                  {chapter.requiresLogin ? (
                    <span className="shrink-0 rounded-full border border-navy-700 px-2 py-0.5 text-xs text-ink-muted">
                      লগইন প্রয়োজন
                    </span>
                  ) : (
                    <span className="shrink-0 rounded-full bg-accent/15 px-2 py-0.5 text-xs text-accent">
                      ফ্রি
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ol>
        </section>
      )}
    </>
  );
}

// Logged-in view: progress, total score, main button and the locked/completed outline.
function CourseOutline({ story }: { story: StoryProgressDetail }) {
  const { progress, score, chapters } = story;
  const base = `/stories/${story.slug}`;
  const first = chapters[0]?.order;

  const main =
    first === undefined
      ? null
      : progress.nextOrder === null
        ? { href: `${base}/${first}`, label: "আবার পড়ুন" }
        : progress.completed === 0
          ? { href: `${base}/${progress.nextOrder}`, label: "শুরু করুন" }
          : {
              href: `${base}/${progress.nextOrder}`,
              label: `চালিয়ে যান: অধ্যায় ${toBnDigits(progress.nextOrder)}`,
            };

  return (
    <section aria-labelledby="course-outline" className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-xl border border-navy-800 bg-navy-900 p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm">
          <p className="text-ink">
            {scoreLabel(progress.completed, progress.total)} অধ্যায় শেষ
          </p>
          <p className="font-semibold text-ink">মোট স্কোর: {scoreLabel(score.points, score.max)}</p>
        </div>
        <ProgressBar
          value={progress.completed}
          max={progress.total}
          label="গল্পের অগ্রগতি"
          valueText={`${scoreLabel(progress.completed, progress.total)} অধ্যায় শেষ`}
        />
        {main && (
          <Link
            href={main.href}
            className="self-start rounded-lg bg-accent px-5 py-2 font-semibold text-navy-950 hover:opacity-90"
          >
            {main.label}
          </Link>
        )}
      </div>

      <h2 id="course-outline" className="text-lg font-semibold text-ink">
        অধ্যায়সমূহ
      </h2>
      <ol className="flex flex-col gap-3">
        {chapters.map((chapter) => {
          const title = (
            <span className="flex min-w-0 flex-col">
              <span className="text-ink">
                অধ্যায় {toBnDigits(chapter.order)}: {chapter.titleBn}
              </span>
              <span lang="en" className="text-sm text-ink-muted">
                {chapter.titleEn}
              </span>
            </span>
          );
          const scoreText =
            chapter.score.max > 0 ? (
              <span className="text-xs text-ink-muted">
                স্কোর {scoreLabel(chapter.score.points, chapter.score.max)}
              </span>
            ) : null;

          if (chapter.lock.locked) {
            return (
              <li key={chapter.order}>
                <div
                  aria-label={`অধ্যায় ${toBnDigits(chapter.order)}: ${chapter.titleBn} — লক করা, আগে অধ্যায় ${toBnDigits(chapter.lock.requiredOrder)} শেষ করুন`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-navy-800 bg-navy-950 p-4 opacity-60"
                >
                  {title}
                  <span aria-hidden="true" className="shrink-0 text-lg">
                    🔒
                  </span>
                </div>
              </li>
            );
          }

          return (
            <li key={chapter.order}>
              <Link
                href={`${base}/${chapter.order}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-navy-800 bg-navy-900 p-4 hover:border-accent"
              >
                {title}
                <span className="flex shrink-0 flex-col items-end gap-1">
                  {chapter.completed ? (
                    <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-xs font-semibold text-emerald-300">
                      ✓ শেষ
                    </span>
                  ) : (
                    <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs text-accent">
                      খোলা
                    </span>
                  )}
                  {scoreText}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
