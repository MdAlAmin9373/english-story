import type { Metadata } from "next";
import { Suspense } from "react";
import { PublishedStoryList } from "@/features/stories/components/PublishedStoryList";

export const metadata: Metadata = { title: "গল্প — English Story" };

export default function StoriesPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-ink">সব গল্প</h1>
        <p className="text-ink-muted">একটি গল্প বেছে নিন, বাংলা ও ইংরেজি পাশাপাশি পড়ুন।</p>
      </div>
      {/* Reads the session cookie and the database, so it streams in behind Suspense. */}
      <Suspense fallback={<p className="text-ink-muted">লোড হচ্ছে…</p>}>
        <PublishedStoryList
          empty={<p className="text-ink-muted">এখনো কোনো গল্প প্রকাশিত হয়নি।</p>}
        />
      </Suspense>
    </main>
  );
}
