import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
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

// Reads params and the database, so it streams in behind Suspense.
async function StoryDetails({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const story = await getStoryBySlug(slug);
  if (!story) notFound();

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
    </>
  );
}
