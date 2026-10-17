// Bengali / English sentence pairs as shown to readers (also used by the admin preview).
export function SentencePairs({
  sentences,
}: {
  sentences: { order: number; bn: string; en: string }[];
}) {
  return (
    <>
      <div className="hidden grid-cols-2 gap-4 px-4 text-xs text-ink-muted sm:grid">
        <span>বাংলা</span>
        <span>English</span>
      </div>

      <ol className="flex flex-col gap-3">
        {sentences.map((sentence) => (
          <li
            key={sentence.order}
            className="grid gap-2 rounded-xl border border-navy-800 bg-navy-900 p-4 sm:grid-cols-2 sm:gap-4"
          >
            <p className="text-lg text-ink">{sentence.bn}</p>
            <p lang="en" className="text-ink-muted sm:text-lg">
              {sentence.en}
            </p>
          </li>
        ))}
      </ol>
    </>
  );
}
