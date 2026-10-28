import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getCurrentUser } from "@/features/auth/session";
import { getAllStoriesProgress } from "@/features/progress/queries";
import { genreLabel, levelLabel, toBnDigits } from "@/features/stories/labels";
import { getPublishedStories } from "@/features/stories/queries";

export const metadata: Metadata = { title: "গল্প — English Story" };

export default function StoriesPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-ink">সব গল্প</h1>
        <p className="text-ink-muted">একটি গল্প বেছে নিন, বাংলা ও ইংরেজি পাশাপাশি পড়ুন।</p>
      </div>
      <Suspense fallback={<p className="text-ink-muted">লোড হচ্ছে…</p>}>
        <StoryList />
      </Suspense>
    </main>
  );
}

// Reads the session cookie and the database, so it streams in behind Suspense.
async function StoryList() {
  const [stories, user] = await Promise.all([getPublishedStories(), getCurrentUser()]);
  const progress = user ? await getAllStoriesProgress(user.id) : [];
  const percent = new Map(progress.map((s) => [s.slug, s.progress.percent]));

  if (stories.length === 0) {
    return <p className="text-ink-muted">এখনো কোনো গল্প প্রকাশিত হয়নি।</p>;
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {stories.map((story) => (
        <li key={story.slug}>
          <Link
            href={`/stories/${story.slug}`}
            className="flex h-full flex-col gap-2 rounded-xl border border-navy-800 bg-navy-900 p-5 hover:border-accent"
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-semibold text-ink">{story.titleBn}</h2>
              {percent.has(story.slug) && (
                <span
                  aria-label={`অগ্রগতি ${toBnDigits(percent.get(story.slug) ?? 0)}%`}
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                    percent.get(story.slug) === 100
                      ? "bg-emerald-400/15 text-emerald-300"
                      : "bg-accent/15 text-accent"
                  }`}
                >
                  {percent.get(story.slug) === 100 ? "✓ " : ""}
                  {toBnDigits(percent.get(story.slug) ?? 0)}%
                </span>
              )}
            </div>
            <p lang="en" className="text-sm text-ink-muted">
              {story.titleEn}
            </p>
            <p className="text-ink-muted">{story.summaryBn}</p>
            <p className="mt-auto flex flex-wrap gap-2 pt-2 text-xs text-accent">
              <span>{genreLabel[story.genre]}</span>
              <span>·</span>
              <span>{levelLabel(story.level)}</span>
              <span>·</span>
              <span>{toBnDigits(story._count.chapters)} অধ্যায়</span>
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
