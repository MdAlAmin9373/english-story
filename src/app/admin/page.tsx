import Link from "next/link";
import { Suspense } from "react";
import { setStoryStatus } from "@/features/admin/actions";
import { ConfirmSubmitButton } from "@/features/admin/components/ConfirmSubmitButton";
import { primaryButtonClass, secondaryButtonClass } from "@/features/admin/components/fields";
import { StatusBadge } from "@/features/admin/components/StatusBadge";
import { getAdminStories } from "@/features/admin/queries";
import { requireAdmin } from "@/features/auth/session";
import { genreLabel, levelLabel, toBnDigits } from "@/features/stories/labels";

export default function AdminHomePage() {
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-ink">সব গল্প</h1>
        <Link href="/admin/stories/new" className={primaryButtonClass}>
          + নতুন গল্প
        </Link>
      </div>
      <Suspense fallback={<p className="text-ink-muted">লোড হচ্ছে…</p>}>
        <AdminStoryList />
      </Suspense>
    </>
  );
}

// Reads the session cookie and the database, so it streams in behind Suspense.
async function AdminStoryList() {
  await requireAdmin("/admin");
  const stories = await getAdminStories();

  if (stories.length === 0) {
    return <p className="text-ink-muted">এখনো কোনো গল্প নেই।</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {stories.map((story) => {
        const published = story.status === "PUBLISHED";
        return (
          <li
            key={story.id}
            className="flex flex-col gap-3 rounded-xl border border-navy-800 bg-navy-900 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex min-w-0 flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-semibold text-ink">{story.titleBn}</h2>
                <StatusBadge status={story.status} />
              </div>
              <p lang="en" className="truncate text-sm text-ink-muted">
                {story.titleEn} · /{story.slug}
              </p>
              <p className="text-xs text-accent">
                {genreLabel[story.genre]} · {levelLabel(story.level)} ·{" "}
                {toBnDigits(story._count.chapters)} অধ্যায়
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Link href={`/admin/stories/${story.id}`} className={secondaryButtonClass}>
                সম্পাদনা
              </Link>
              <form action={setStoryStatus}>
                <input type="hidden" name="id" value={story.id} />
                <input type="hidden" name="status" value={published ? "DRAFT" : "PUBLISHED"} />
                <ConfirmSubmitButton
                  className={secondaryButtonClass}
                  message={
                    published
                      ? `"${story.titleBn}" খসড়া করলে পাঠকেরা আর এটি দেখতে পাবে না। নিশ্চিত?`
                      : `"${story.titleBn}" প্রকাশ করবেন?`
                  }
                >
                  {published ? "খসড়া করুন" : "প্রকাশ করুন"}
                </ConfirmSubmitButton>
              </form>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
