import {
  buildTenseTable,
  tenseKindLabel,
  tenseKinds,
  tenseTimeLabel,
  type TenseFormInput,
} from "@/features/vocab/tense-table";

export function TenseTable({ word, forms }: { word: string; forms: TenseFormInput[] }) {
  const rows = buildTenseTable(forms);

  return (
    <div className="overflow-x-auto rounded-lg border border-navy-800">
      <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
        <caption className="sr-only">
          <span lang="en">{word}</span> — কালের রূপ
        </caption>
        <thead>
          <tr className="bg-navy-950 text-ink-muted">
            <th scope="col" className="p-2 font-medium">
              কাল
            </th>
            {tenseKinds.map((kind) => (
              <th key={kind} scope="col" className="p-2 font-medium">
                {tenseKindLabel[kind].bn}{" "}
                <span lang="en" className="text-xs">
                  ({tenseKindLabel[kind].en})
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.time} className="border-t border-navy-800 align-top">
              <th scope="row" className="p-2 font-medium text-accent">
                {tenseTimeLabel[row.time].bn}
                <span lang="en" className="block text-xs text-ink-muted">
                  {tenseTimeLabel[row.time].en}
                </span>
              </th>
              {row.cells.map((cell, i) => (
                <td key={tenseKinds[i]} className="p-2">
                  {cell ? (
                    <>
                      <p lang="en" className="font-semibold text-ink">
                        {cell.form}
                      </p>
                      <p lang="en" className="text-xs text-ink-muted">
                        {cell.exampleEn}
                      </p>
                    </>
                  ) : (
                    <span className="text-ink-muted">—</span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
