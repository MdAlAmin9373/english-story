// Pure helpers that split a note body into paragraph and table blocks.
// Plain string splitting only (no HTML or markdown); blocks are rendered as React text.

export const MIN_TABLE_CELLS = 2;
export const MAX_TABLE_CELLS = 6;

// A first row made only of these cells (any order, any number) becomes the header row.
export const TABLE_HEADINGS: readonly string[] = [
  "শব্দ",
  "উচ্চারণ",
  "বাংলায় উচ্চারণ",
  "অর্থ",
  "সূত্র",
];

export type NoteBlock =
  | { type: "paragraph"; text: string }
  | { type: "table"; header: string[] | null; rows: string[][] };

// "think | থিংক | ভাবা" → ["think", "থিংক", "ভাবা"]. A line is a table row when it
// contains " | " and has 2 to 6 cells; it is then split on every "|".
export function parseTableRow(line: string): string[] | null {
  if (!line.includes(" | ")) return null;
  const cells = line.split("|").map((cell) => cell.trim());
  return cells.length >= MIN_TABLE_CELLS && cells.length <= MAX_TABLE_CELLS ? cells : null;
}

export function isHeadingRow(cells: readonly string[]): boolean {
  return cells.every((cell) => TABLE_HEADINGS.includes(cell));
}

// Latin letters and no Bengali script: the cell gets lang="en".
export function isEnglishCell(cell: string): boolean {
  return /[A-Za-z]/.test(cell) && !/[ঀ-৿]/.test(cell);
}

// Consecutive table rows form one table; a blank or normal line ends it. Other
// lines stay paragraphs joined with "\n", so whitespace-pre-line keeps their breaks.
export function parseNoteBody(body: string): NoteBlock[] {
  const blocks: NoteBlock[] = [];
  let paragraph: string[] = [];
  let table: string[][] = [];

  const flushParagraph = () => {
    const text = paragraph.join("\n").trim();
    if (text) blocks.push({ type: "paragraph", text });
    paragraph = [];
  };

  const flushTable = () => {
    if (table.length === 0) return;
    // Short rows are padded so every row has the same number of columns.
    const columns = Math.max(...table.map((row) => row.length));
    const padded = table.map((row) => [
      ...row,
      ...Array<string>(columns - row.length).fill(""),
    ]);
    const hasHeader = isHeadingRow(table[0]);
    blocks.push({
      type: "table",
      header: hasHeader ? padded[0] : null,
      rows: hasHeader ? padded.slice(1) : padded,
    });
    table = [];
  };

  for (const line of body.split(/\r\n?|\n/)) {
    const cells = parseTableRow(line);
    if (cells) {
      flushParagraph();
      table.push(cells);
    } else {
      flushTable();
      paragraph.push(line);
    }
  }
  flushParagraph();
  flushTable();
  return blocks;
}
