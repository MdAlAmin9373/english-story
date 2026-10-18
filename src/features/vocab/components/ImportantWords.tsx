import { toBnDigits } from "@/features/stories/labels";
import { TenseTable } from "@/features/vocab/components/TenseTable";
import { getChapterWords, getWordFormsFor } from "@/features/vocab/queries";
import type { TenseFormInput } from "@/features/vocab/tense-table";

// Reads the database: render inside <Suspense>, after the chapter access check.
export async function ImportantWords({ chapterId }: { chapterId: string }) {
  const words = await getChapterWords(chapterId);
  if (words.length === 0) return null;

  const forms = await getWordFormsFor(words.map((w) => w.word));
  const formsByWord = new Map<string, TenseFormInput[]>();
  for (const { word, ...form } of forms) {
    formsByWord.set(word, [...(formsByWord.get(word) ?? []), form]);
  }

  return (
    <section aria-labelledby="important-words" className="flex flex-col gap-3 pt-4">
      <h2 id="important-words" className="text-xl font-bold text-ink">
        গুরুত্বপূর্ণ শব্দ · <span lang="en">Important words</span>
      </h2>

      <ul className="grid gap-3 sm:grid-cols-2">
        {words.map((w) => {
          const wordForms = formsByWord.get(w.word);
          return (
            <li
              key={w.order}
              className={`flex flex-col gap-2 rounded-xl border border-navy-800 bg-navy-900 p-4 ${
                wordForms ? "sm:col-span-2" : ""
              }`}
            >
              <div className="flex flex-wrap items-baseline gap-x-3">
                <span className="text-sm text-ink-muted">{toBnDigits(w.order)}.</span>
                <span lang="en" className="text-lg font-semibold text-accent">
                  {w.word}
                </span>
                <span className="text-sm text-ink-muted">
                  উচ্চারণ · <span lang="en">Pronunciation</span>: {w.pronunciationBn}
                </span>
              </div>
              <p className="text-ink">
                অর্থ · <span lang="en">Meaning</span>: {w.meaningBn}
              </p>
              <div className="border-l-2 border-navy-700 pl-3 text-sm">
                <p lang="en" className="text-ink">
                  {w.exampleEn}
                </p>
                <p className="text-ink-muted">{w.exampleBn}</p>
              </div>

              {wordForms && (
                <details className="group">
                  <summary className="cursor-pointer text-sm text-accent hover:opacity-90">
                    কালের রূপ · <span lang="en">Tense forms</span>
                  </summary>
                  <div className="pt-3">
                    <TenseTable word={w.word} forms={wordForms} />
                  </div>
                </details>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
