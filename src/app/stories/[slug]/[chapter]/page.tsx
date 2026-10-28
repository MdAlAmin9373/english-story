import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { loginPathWithNext } from "@/features/auth/next-path";
import { getCurrentUser } from "@/features/auth/session";
import { ChapterNotes } from "@/features/notes/components/ChapterNotes";
import { getChapterLock, getChapterStatus } from "@/features/progress/queries";
import { ChapterQuiz } from "@/features/quiz/components/ChapterQuiz";
import { ChapterScoreCard } from "@/features/quiz/components/ChapterScoreCard";
import { QuizProgressProvider } from "@/features/quiz/components/QuizProgress";
import { canReadChapter } from "@/features/stories/access";
import { toBnDigits } from "@/features/stories/labels";
import { getChapter } from "@/features/stories/queries";
import { SentencePairs } from "@/features/stories/components/SentencePairs";
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

  // Sequential lock for logged-in users, enforced here on the server.
  const [lock, status] = user
    ? await Promise.all([
        getChapterLock(
          { storyId: chapter.story.id, order: chapter.order },
          user.id,
          chapter.publishedOrders,
        ),
        getChapterStatus(chapter.id, user.id),
      ])
    : [null, null];

  const header = (
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
    </>
  );

  if (lock?.locked) {
    return (
      <>
        {header}
        <section className="flex flex-col items-start gap-3 rounded-xl border border-navy-800 bg-navy-900 p-5">
          <p className="text-lg font-semibold text-ink">
            <span aria-hidden="true">🔒 </span>
            আগে অধ্যায় {toBnDigits(lock.requiredOrder)} শেষ করুন
          </p>
          <p className="text-sm text-ink-muted">
            অধ্যায়গুলো ক্রমানুসারে খোলে। আগের অধ্যায়ের সব অনুশীলন সঠিক করে শেষ করলে এটি খুলবে।
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`${base}/${lock.requiredOrder}`}
              className="rounded-lg bg-accent px-4 py-2 font-semibold text-navy-950 hover:opacity-90"
            >
              অধ্যায় {toBnDigits(lock.requiredOrder)}-এ যান →
            </Link>
            <Link
              href={base}
              className="rounded-lg border border-navy-700 px-4 py-2 text-ink hover:border-accent"
            >
              সব অধ্যায়
            </Link>
          </div>
        </section>
      </>
    );
  }

  const content = (
    <>
      <SentencePairs sentences={chapter.sentences} />

      <Suspense fallback={<p className="text-ink-muted">শব্দ লোড হচ্ছে…</p>}>
        <ImportantWords chapterId={chapter.id} />
      </Suspense>

      <Suspense fallback={<p className="text-ink-muted">নোট লোড হচ্ছে…</p>}>
        <ChapterNotes chapterId={chapter.id} />
      </Suspense>

      {user && status ? (
        <Suspense fallback={<p className="text-ink-muted">অনুশীলন লোড হচ্ছে…</p>}>
          <ChapterQuiz chapterId={chapter.id} userId={user.id} status={status} />
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
    </>
  );

  return (
    <>
      {header}

      {status ? (
        // The score card and the quiz share one live state, seeded from the server.
        <QuizProgressProvider
          questionTotal={status.requirements.questions.total}
          taskTotal={status.requirements.tasks.total}
          solvedQuestions={status.solvedQuestions}
          solvedTasks={status.solvedTasks}
        >
          <ChapterScoreCard position={chapter.position} total={chapter.total} />
          {content}
        </QuizProgressProvider>
      ) : (
        content
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
