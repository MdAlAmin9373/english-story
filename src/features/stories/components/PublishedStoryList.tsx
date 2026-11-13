import Link from "next/link";
import type { ReactNode } from "react";
import type { StoryCategory } from "@prisma/client";
import { getCurrentUser } from "@/features/auth/session";
import { getAllStoriesProgress } from "@/features/progress/queries";
import { genreLabel, levelLabel, toBnDigits } from "../labels";
import { getPublishedStories, getPublishedStoriesByCategory } from "../queries";

// Story cards for /stories and /stories/category/[slug]. The story list is cached
// (see ../queries); the progress badges read the session cookie, so render this
// inside <Suspense>.
export async function PublishedStoryList({
  category,
  empty,
}: {
  category?: StoryCategory;
  empty: ReactNode;
}) {
  const [stories, user] = await Promise.all([
    category ? getPublishedStoriesByCategory(category) : getPublishedStories(),
    getCurrentUser(),
  ]);
  const progress = user ? await getAllStoriesProgress(user.id) : [];
  const percent = new Map(progress.map((s) => [s.slug, s.progress.percent]));

  if (stories.length === 0) return <>{empty}</>;

  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {stories.map((story) => (
        <li key={story.slug}>
          <Link
            href={`/stories/${story.slug}`}
            className="flex h-full flex-col gap-2 rounded-xl border border-line bg-surface p-5 hover:border-accent"
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-semibold text-ink">{story.titleBn}</h2>
              {percent.has(story.slug) && (
                <span
                  aria-label={`অগ্রগতি ${toBnDigits(percent.get(story.slug) ?? 0)}%`}
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                    percent.get(story.slug) === 100
                      ? "bg-success-strong/15 text-success"
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
