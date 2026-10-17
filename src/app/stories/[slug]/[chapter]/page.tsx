import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { loginPathWithNext } from "@/features/auth/next-path";
import { getCurrentUser } from "@/features/auth/session";
import { ChapterQuiz } from "@/features/quiz/components/ChapterQuiz";
import { canReadChapter } from "@/features/stories/access";
import { toBnDigits } from "@/features/stories/labels";
import { getChapter } from "@/features/stories/queries";
import { ImportantWords } from "@/features/vocab/components/ImportantWords";

export const metadata: Metadata = { title: "পড়ুন — English Story" };

export default function ChapterPage({
  params,
}: PageProps<"/stories/[slug]/[chapter]">) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <Suspense fallback={<p className="text-ink-muted">লোড হচ্ছে…</p>}>
        <ChapterReader params={params} />
      </Suspense>
    </main>
  );
}

// Reads params, the session cookie and the database, so it streams in behind Suspense.
async function ChapterReader({
  params,
}: {
  params: Promise<{ slug: string; chapter: string }>;
}) {
  const { slug, chapter: chapterParam } = await params;
  if (!/^\d{1,6}$/.test(chapterParam)) notFound();

  const [chapter, user] = await Promise.all([
    getChapter(slug, Number(chapterParam)),
    getCurrentUser(),
  ]);
  if (!chapter) notFound();
  const base = `/stories/${chapter.story.slug}`;
  if (!canReadChapter(chapter, user !== null)) {
    redirect(loginPathWithNext(`${base}/${chapter.order}`));
  }

  return (
    <>
      <Link href={base} className="text-sm text-ink-muted hover:text-accent">
        ← {chapter.story.titleBn}
      </Link>

      <header className="flex flex-col gap-1">
        <p className="text-sm text-accent">অধ্যায় {toBnDigits(chapter.order)}</p>
        <h1 className="text-2xl font-bold text-ink">{chapter.titleBn}</h1>
        <p lang="en" className="text-ink-muted">
          {chapter.titleEn}
        </p>
      </header>

      <div className="hidden grid-cols-2 gap-4 px-4 text-xs text-ink-muted sm:grid">
        <span>বাংলা</span>
        <span>English</span>
      </div>

      <ol className="flex flex-col gap-3">
        {chapter.sentences.map((sentence) => (
          <li
            key={sentence.order}
            className="grid gap-2 rounded-xl border border-navy-800 bg-navy-900 p-4 sm:grid-cols-2 sm:gap-4"
          >
            <p className="text-lg text-ink">{sentence.bn}</p>
            <p lang="en" className="text-ink-muted sm:text-lg">
              {sentence.en}
            </p>
          </li>
        ))}
      </ol>

      <Suspense fallback={<p className="text-ink-muted">শব্দ লোড হচ্ছে…</p>}>
        <ImportantWords chapterId={chapter.id} />
      </Suspense>

      {user ? (
        <Suspense fallback={<p className="text-ink-muted">অনুশীলন লোড হচ্ছে…</p>}>
          <ChapterQuiz chapterId={chapter.id} userId={user.id} />
        </Suspense>
      ) : (
        <p className="rounded-xl border border-navy-800 bg-navy-900 p-4 text-ink-muted">
          অনুশীলন করতে ও অগ্রগতি সংরক্ষণ করতে{" "}
          <Link
            href={loginPathWithNext(`${base}/${chapter.order}`)}
            className="text-accent hover:underline"
          >
            লগইন করুন
          </Link>
          ।
        </p>
      )}

      <nav aria-label="অধ্যায় নেভিগেশন" className="flex justify-between gap-3 pt-2">
        {chapter.prevOrder !== null ? (
          <Link
            href={`${base}/${chapter.prevOrder}`}
            className="rounded-lg border border-navy-700 px-4 py-2 text-ink hover:border-accent"
          >
            ← আগের অধ্যায়
          </Link>
        ) : (
          <span />
        )}
        {chapter.nextOrder !== null ? (
          <Link
            href={`${base}/${chapter.nextOrder}`}
            className="rounded-lg bg-accent px-4 py-2 font-semibold text-navy-950 hover:opacity-90"
          >
            পরের অধ্যায় →
          </Link>
        ) : (
          <Link
            href={base}
            className="rounded-lg border border-navy-700 px-4 py-2 text-ink hover:border-accent"
          >
            গল্প শেষ ✓
          </Link>
        )}
      </nav>
    </>
  );
}
