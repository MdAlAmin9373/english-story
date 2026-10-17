import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { moveChapter, setChapterStatus, updateStory } from "@/features/admin/actions";
import { ConfirmSubmitButton } from "@/features/admin/components/ConfirmSubmitButton";
import { primaryButtonClass, secondaryButtonClass } from "@/features/admin/components/fields";
import { MoveButtons } from "@/features/admin/components/MoveButtons";
import { StatusBadge } from "@/features/admin/components/StatusBadge";
import { StoryForm } from "@/features/admin/components/StoryForm";
import { getAdminStory } from "@/features/admin/queries";
import { requireAdmin } from "@/features/auth/session";
import { toBnDigits } from "@/features/stories/labels";

export default function EditStoryPage({ params }: PageProps<"/admin/stories/[storyId]">) {
  return (
    <>
      <Link href="/admin" className="text-sm text-ink-muted hover:text-accent">
        ← সব গল্প
      </Link>
      <Suspense fallback={<p className="text-ink-muted">লোড হচ্ছে…</p>}>
        <EditStory params={params} />
      </Suspense>
    </>
  );
}

// Reads params, the session cookie and the database, so it streams in behind Suspense.
async function EditStory({ params }: { params: Promise<{ storyId: string }> }) {
  const { storyId } = await params;
  await requireAdmin(`/admin/stories/${storyId}`);
  const story = await getAdminStory(storyId);
  if (!story) notFound();

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-bold text-ink">{story.titleBn}</h1>
        <StatusBadge status={story.status} />
      </div>

      <section className="rounded-xl border border-navy-800 bg-navy-900 p-4 sm:p-6">
        <StoryForm
          action={updateStory.bind(null, story.id)}
          story={story}
          submitLabel="সংরক্ষণ করুন"
        />
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-ink">অধ্যায়সমূহ</h2>
          <Link href={`/admin/stories/${story.id}/chapters/new`} className={primaryButtonClass}>
            + নতুন অধ্যায়
          </Link>
        </div>
        {story.chapters.length === 0 ? (
          <p className="text-ink-muted">এখনো কোনো অধ্যায় নেই।</p>
        ) : (
          <ol className="flex flex-col gap-2">
            {story.chapters.map((chapter, i) => {
              const published = chapter.status === "PUBLISHED";
              return (
                <li
                  key={chapter.id}
                  className="flex flex-col gap-3 rounded-xl border border-navy-800 bg-navy-900 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <Link
                    href={`/admin/stories/${story.id}/chapters/${chapter.id}`}
                    className="flex min-w-0 flex-col gap-0.5 hover:text-accent"
                  >
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-sm text-accent">
                        অধ্যায় {toBnDigits(chapter.order)}
                      </span>
                      <span className="text-ink">{chapter.titleBn}</span>
                      <StatusBadge status={chapter.status} />
                    </span>
                    <span lang="en" className="text-sm text-ink-muted">
                      {chapter.titleEn}
                    </span>
                    <span className="text-xs text-ink-muted">
                      {chapter.requiresLogin ? "লগইন লাগবে" : "সবার জন্য খোলা"}
                    </span>
                  </Link>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <MoveButtons
                      action={moveChapter}
                      id={chapter.id}
                      isFirst={i === 0}
                      isLast={i === story.chapters.length - 1}
                    />
                    <form action={setChapterStatus}>
                      <input type="hidden" name="id" value={chapter.id} />
                      <input
                        type="hidden"
                        name="status"
                        value={published ? "DRAFT" : "PUBLISHED"}
                      />
                      <ConfirmSubmitButton
                        className={secondaryButtonClass}
                        message={
                          published
                            ? `"${chapter.titleBn}" খসড়া করলে পাঠকেরা আর এটি দেখতে পাবে না। নিশ্চিত?`
                            : `"${chapter.titleBn}" প্রকাশ করবেন?`
                        }
                      >
                        {published ? "খসড়া করুন" : "প্রকাশ করুন"}
                      </ConfirmSubmitButton>
                    </form>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </>
  );
}
