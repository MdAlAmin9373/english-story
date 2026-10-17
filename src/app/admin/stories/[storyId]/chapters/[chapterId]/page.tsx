import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { updateChapter } from "@/features/admin/actions";
import { ChapterForm } from "@/features/admin/components/ChapterForm";
import { StatusBadge } from "@/features/admin/components/StatusBadge";
import { getAdminChapter } from "@/features/admin/queries";
import { requireAdmin } from "@/features/auth/session";
import { toBnDigits } from "@/features/stories/labels";

export default function EditChapterPage({
  params,
}: PageProps<"/admin/stories/[storyId]/chapters/[chapterId]">) {
  return (
    <Suspense fallback={<p className="text-ink-muted">লোড হচ্ছে…</p>}>
      <EditChapter params={params} />
    </Suspense>
  );
}

// Reads params, the session cookie and the database, so it streams in behind Suspense.
async function EditChapter({
  params,
}: {
  params: Promise<{ storyId: string; chapterId: string }>;
}) {
  const { storyId, chapterId } = await params;
  await requireAdmin(`/admin/stories/${storyId}/chapters/${chapterId}`);
  const chapter = await getAdminChapter(storyId, chapterId);
  if (!chapter) notFound();

  return (
    <>
      <Link
        href={`/admin/stories/${chapter.story.id}`}
        className="text-sm text-ink-muted hover:text-accent"
      >
        ← {chapter.story.titleBn}
      </Link>
      <header className="flex flex-col gap-1">
        <p className="text-sm text-accent">অধ্যায় {toBnDigits(chapter.order)}</p>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold text-ink">{chapter.titleBn}</h1>
          <StatusBadge status={chapter.status} />
        </div>
      </header>

      <section className="rounded-xl border border-navy-800 bg-navy-900 p-4 sm:p-6">
        <ChapterForm
          action={updateChapter.bind(null, chapter.id)}
          chapter={chapter}
          submitLabel="সংরক্ষণ করুন"
        />
      </section>
    </>
  );
}
