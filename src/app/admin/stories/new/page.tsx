import Link from "next/link";
import { Suspense } from "react";
import { createStory } from "@/features/admin/actions";
import { StoryForm } from "@/features/admin/components/StoryForm";
import { requireAdmin } from "@/features/auth/session";

export default function NewStoryPage() {
  return (
    <>
      <Link href="/admin" className="text-sm text-ink-muted hover:text-accent">
        ← সব গল্প
      </Link>
      <h1 className="text-2xl font-bold text-ink">নতুন গল্প</h1>
      <Suspense fallback={<p className="text-ink-muted">লোড হচ্ছে…</p>}>
        <NewStory />
      </Suspense>
    </>
  );
}

// Reads the session cookie, so it streams in behind Suspense.
async function NewStory() {
  await requireAdmin("/admin/stories/new");
  return (
    <div className="rounded-xl border border-navy-800 bg-navy-900 p-4 sm:p-6">
      <StoryForm action={createStory} submitLabel="গল্প তৈরি করুন" />
    </div>
  );
}
