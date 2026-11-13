import Link from "next/link";
import { Suspense } from "react";
import { Bookshelf } from "@/features/stories/components/Bookshelf";
import { getPublishedCategoryCounts } from "@/features/stories/queries";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-4 py-12 sm:px-6 sm:py-16">
      <header className="flex flex-col items-center gap-3 text-center">
        <p lang="en" className="text-sm font-semibold tracking-wide text-accent">
          Learn English by stories
        </p>
        <h1 className="text-3xl font-bold text-ink sm:text-4xl">গল্পের তাক থেকে একটি বই বেছে নিন</h1>
        <p className="max-w-xl text-lg text-ink-muted">
          ছোট ছোট গল্প পড়ুন, কুইজ খেলুন — খুব সহজেই ইংরেজি শিখুন।
        </p>
      </header>

      <Suspense fallback={<p className="text-center text-ink-muted">লোড হচ্ছে…</p>}>
        <Shelf />
      </Suspense>

      <Link href="/stories" className="self-center text-accent hover:underline">
        সব গল্প একসাথে দেখুন →
      </Link>
    </main>
  );
}

// Cached database read (tagged "stories"), refreshed by the admin actions.
async function Shelf() {
  const counts = await getPublishedCategoryCounts();
  return <Bookshelf counts={counts} />;
}
