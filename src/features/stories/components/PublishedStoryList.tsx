import Link from "next/link";
import type { ReactNode } from "react";
import type { StoryCategory } from "@prisma/client";
import { categoryByValue } from "../categories";
import { levelLabel, toBnDigits } from "../labels";
import { getPublishedStories, getPublishedStoriesByCategory } from "../queries";

// Story index for /stories and /stories/category/[slug]: a clean table-of-contents
// list — one entry per story with its titles, inline metadata and a one-line
// English/Bengali preview. The story list is cached (see ../queries).
export async function PublishedStoryList({
  category,
  empty,
}: {
  category?: StoryCategory;
  empty: ReactNode;
}) {
  const stories = category
    ? await getPublishedStoriesByCategory(category)
    : await getPublishedStories();

  if (stories.length === 0) return <>{empty}</>;

  return (
    <ul className="flex flex-col gap-8">
      {stories.map((story) => (
        <li key={story.slug}>
          <Link
            href={`/stories/${story.slug}`}
            className="group flex flex-col gap-1"
          >
            <h2 className="text-lg font-bold text-ink group-hover:text-accent">
              {story.titleBn}
            </h2>
            <p lang="en" className="text-sm text-ink-muted">
              {story.titleEn}
            </p>
            <p className="text-xs text-accent">
              {categoryByValue(story.category).nameBn} · {levelLabel(story.level)} ·{" "}
              {toBnDigits(story._count.chapters)} অধ্যায়
            </p>
            <p lang="en" className="text-sm text-ink">
              {story.summaryEn}
            </p>
            <p className="text-sm text-ink-muted">{story.summaryBn}</p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
