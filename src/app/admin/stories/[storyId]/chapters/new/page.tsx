import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { createChapter } from "@/features/admin/actions";
import { ChapterForm } from "@/features/admin/components/ChapterForm";
import { getAdminStoryTitle } from "@/features/admin/queries";
import { requireAdmin } from "@/features/auth/session";

export default function NewChapterPage({
  params,
}: PageProps<"/admin/stories/[storyId]/chapters/new">) {
  return (
    <Suspense fallback={<p className="text-ink-muted">লোড হচ্ছে…</p>}>
      <NewChapter params={params} />
    </Suspense>
  );
}

// Reads params, the session cookie and the database, so it streams in behind Suspense.
async function NewChapter({ params }: { params: Promise<{ storyId: string }> }) {
  const { storyId } = await params;
  await requireAdmin(`/admin/stories/${storyId}/chapters/new`);
  const story = await getAdminStoryTitle(storyId);
  if (!story) notFound();

  return (
    <>
      <Link
        href={`/admin/stories/${story.id}`}
        className="text-sm text-ink-muted hover:text-accent"
      >
        ← {story.titleBn}
      </Link>
      <h1 className="text-2xl font-bold text-ink">নতুন অধ্যায়</h1>
      <p className="text-sm text-ink-muted">
        &quot;অধ্যায় তৈরি করুন&quot; সফল হলেই বাক্য, শব্দ ও কুইজ প্রশ্ন যোগ করার ঘরগুলো দেখাবে। তৈরি
        না হলে লাল রঙের ভুলটি ঠিক করে আবার চেষ্টা করুন।
      </p>
      <div className="rounded-xl border border-navy-800 bg-navy-900 p-4 sm:p-6">
        <ChapterForm
          action={createChapter.bind(null, story.id)}
          submitLabel="অধ্যায় তৈরি করুন"
        />
      </div>
    </>
  );
}
