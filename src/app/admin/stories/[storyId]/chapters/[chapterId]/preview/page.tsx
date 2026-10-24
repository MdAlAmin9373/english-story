import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { QuizPreview } from "@/features/admin/components/QuizPreview";
import { StatusBadge } from "@/features/admin/components/StatusBadge";
import { getAdminChapter } from "@/features/admin/queries";
import { requireAdmin } from "@/features/auth/session";
import { ChapterNotes } from "@/features/notes/components/ChapterNotes";
import { SentencePairs } from "@/features/stories/components/SentencePairs";
import { toBnDigits } from "@/features/stories/labels";
import { ImportantWords } from "@/features/vocab/components/ImportantWords";

export default function ChapterPreviewPage({
  params,
}: PageProps<"/admin/stories/[storyId]/chapters/[chapterId]/preview">) {
  return (
    <Suspense fallback={<p className="text-ink-muted">লোড হচ্ছে…</p>}>
      <ChapterPreview params={params} />
    </Suspense>
  );
}

// Reads params, the session cookie and the database, so it streams in behind Suspense.
// Shows drafts too; prev/next links are left out because draft pages 404 for readers.
async function ChapterPreview({
  params,
}: {
  params: Promise<{ storyId: string; chapterId: string }>;
}) {
  const { storyId, chapterId } = await params;
  await requireAdmin(`/admin/stories/${storyId}/chapters/${chapterId}/preview`);
  const chapter = await getAdminChapter(storyId, chapterId);
  if (!chapter) notFound();

  return (
    <>
      <div className="flex flex-col gap-2 rounded-xl border-2 border-accent bg-navy-900 p-4">
        <p className="font-bold text-accent">খসড়া প্রিভিউ</p>
        <p className="flex flex-wrap items-center gap-2 text-sm text-ink-muted">
          গল্প: <StatusBadge status={chapter.story.status} />
          · অধ্যায়: <StatusBadge status={chapter.status} />
        </p>
        <p className="text-sm text-ink-muted">
          পাঠকেরা যেভাবে দেখবে সেভাবেই দেখানো হচ্ছে। এখানে কুইজের উত্তর দেওয়া বা অধ্যায় শেষ করা যায় না।
        </p>
        <Link
          href={`/admin/stories/${chapter.story.id}/chapters/${chapter.id}`}
          className="self-start text-sm text-accent hover:underline"
        >
          ← সম্পাদনায় ফিরুন
        </Link>
      </div>

      <p className="text-sm text-ink-muted">← {chapter.story.titleBn}</p>

      <header className="flex flex-col gap-1">
        <p className="text-sm text-accent">অধ্যায় {toBnDigits(chapter.order)}</p>
        <h1 className="text-2xl font-bold text-ink">{chapter.titleBn}</h1>
        <p lang="en" className="text-ink-muted">
          {chapter.titleEn}
        </p>
      </header>

      <SentencePairs sentences={chapter.sentences} />

      <Suspense fallback={<p className="text-ink-muted">শব্দ লোড হচ্ছে…</p>}>
        <ImportantWords chapterId={chapter.id} />
      </Suspense>

      <Suspense fallback={<p className="text-ink-muted">নোট লোড হচ্ছে…</p>}>
        <ChapterNotes chapterId={chapter.id} />
      </Suspense>

      <QuizPreview questions={chapter.quizQuestions} orderTasks={chapter.orderTasks} />
    </>
  );
}
