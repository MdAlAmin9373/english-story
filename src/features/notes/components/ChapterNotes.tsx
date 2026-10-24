import { getChapterNotes } from "@/features/notes/queries";
import { noteKindLabel } from "@/features/stories/labels";

// Reads the database: render inside <Suspense>, after the chapter access check.
// Note text is plain React text (never HTML); whitespace-pre-line keeps its line breaks.
export async function ChapterNotes({ chapterId }: { chapterId: string }) {
  const notes = await getChapterNotes(chapterId);
  if (notes.length === 0) return null;

  return (
    <section aria-labelledby="chapter-notes" className="flex flex-col gap-3 pt-4">
      <h2 id="chapter-notes" className="text-xl font-bold text-ink">
        উচ্চারণ ও ব্যাকরণ · <span lang="en">Pronunciation &amp; grammar</span>
      </h2>

      <ul className="flex flex-col gap-3">
        {notes.map((note) => (
          <li
            key={note.order}
            className="flex flex-col gap-2 rounded-xl border border-navy-800 bg-navy-900 p-4"
          >
            <div className="flex flex-col gap-0.5">
              <span className="self-start rounded-full border border-navy-700 px-2 py-0.5 text-xs text-accent">
                {noteKindLabel[note.kind]}
              </span>
              <h3 className="text-lg font-semibold text-ink">{note.titleBn}</h3>
              <p lang="en" className="text-sm text-ink-muted">
                {note.titleEn}
              </p>
            </div>
            <p className="whitespace-pre-line break-words text-ink">{note.bodyBn}</p>
            <p lang="en" className="border-l-2 border-navy-700 pl-3 text-sm text-ink">
              {note.exampleEn}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
