import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CATEGORIES, categoryBySlug } from "@/features/stories/categories";
import { PublishedStoryList } from "@/features/stories/components/PublishedStoryList";

// The six category pages are prerendered; any other slug is a 404 (dynamicParams is
// not available with Cache Components, so the page calls notFound() itself).
export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/stories/category/[slug]">): Promise<Metadata> {
  const category = categoryBySlug((await params).slug);
  return { title: category ? `${category.nameBn} — English Story` : "গল্প — English Story" };
}

export default function CategoryPage({ params }: PageProps<"/stories/category/[slug]">) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <Link href="/" className="self-start text-sm text-ink-muted hover:text-accent">
        ← সব বিভাগ
      </Link>
      <Suspense fallback={<p className="text-ink-muted">লোড হচ্ছে…</p>}>
        <CategoryStories params={params} />
      </Suspense>
    </main>
  );
}

// Reads params, the session cookie and the database, so it streams in behind Suspense.
async function CategoryStories({ params }: { params: Promise<{ slug: string }> }) {
  const category = categoryBySlug((await params).slug);
  if (!category) notFound();

  return (
    <>
      <header className="flex flex-col gap-1">
        <h1 className="flex items-center gap-3 text-2xl font-bold text-ink">
          <span aria-hidden="true">{category.icon}</span>
          {category.nameBn}
        </h1>
        <p lang="en" className="text-ink-muted">
          {category.nameEn}
        </p>
      </header>
      <PublishedStoryList
        category={category.value}
        empty={
          <div className="flex flex-col items-start gap-3 rounded-xl border border-line bg-surface p-6">
            <p className="text-ink">এই বিভাগে এখনো কোনো গল্প প্রকাশিত হয়নি।</p>
            <p className="text-ink-muted">শীঘ্রই নতুন গল্প আসছে। ততক্ষণ অন্য গল্পগুলো পড়ে দেখুন।</p>
            <Link href="/stories" className="text-accent hover:underline">
              সব গল্প দেখুন →
            </Link>
          </div>
        }
      />
    </>
  );
}
