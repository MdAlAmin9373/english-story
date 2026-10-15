export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center sm:px-6">
      <h1 className="text-3xl font-bold text-ink sm:text-5xl">
        Learn English by stories
      </h1>
      <p className="max-w-md text-lg text-ink-muted">
        গল্প পড়ে সহজে ইংরেজি শিখুন
      </p>
      <span className="rounded-full border border-navy-700 bg-navy-800 px-4 py-1 text-sm text-accent">
        শীঘ্রই আসছে
      </span>
    </main>
  );
}
