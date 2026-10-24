import { isEnglishCell, parseNoteBody } from "@/features/notes/note-body";
import { getChapterNotes } from "@/features/notes/queries";
import { noteKindLabel } from "@/features/stories/labels";

// Each column is at least this wide, so wide tables scroll sideways on phones.
const TABLE_COLUMN_REM = 7;

// Reads the database: render inside <Suspense>, after the chapter access check.
// Note text is plain React text (never HTML); whitespace-pre-line keeps paragraph
// line breaks, and "a | b | c" lines become tables (see note-body.ts).
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
            {parseNoteBody(note.bodyBn).map((block, i) =>
              block.type === "paragraph" ? (
                <p key={i} className="whitespace-pre-line break-words text-ink">
                  {block.text}
                </p>
              ) : (
                <NoteTable key={i} header={block.header} rows={block.rows} />
              ),
            )}
            <p lang="en" className="border-l-2 border-navy-700 pl-3 text-sm text-ink">
              {note.exampleEn}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function NoteTable({ header, rows }: { header: string[] | null; rows: string[][] }) {
  const columns = header?.length ?? rows[0]?.length ?? 0;

  return (
    <div className="overflow-x-auto rounded-lg border border-navy-700">
      <table
        className="w-full border-collapse text-left text-sm"
        style={{ minWidth: `${columns * TABLE_COLUMN_REM}rem` }}
      >
        {header && (
          <thead className="bg-navy-950">
            <tr>
              {header.map((cell, c) => (
                <th
                  key={c}
                  scope="col"
                  className="border-b border-navy-700 px-3 py-2 font-semibold text-accent"
                >
                  {cell}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {rows.map((row, r) => (
            <tr key={r} className="border-t border-navy-800 first:border-t-0">
              {row.map((cell, c) => (
                <td
                  key={c}
                  lang={isEnglishCell(cell) ? "en" : undefined}
                  className="px-3 py-2 align-top text-ink"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
