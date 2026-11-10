// A revealed hint, shared by the admin preview and the reader's quiz cards.
// Plain text only (never HTML); line breaks written by the admin are kept.
export function HintBox({ hint }: { hint: string }) {
  return (
    <div
      role="note"
      aria-label="ইঙ্গিত"
      className="flex flex-col gap-1 rounded-lg border border-accent bg-raised p-3"
    >
      <p className="text-xs font-semibold text-accent">
        <span aria-hidden="true">💡 </span>ইঙ্গিত
      </p>
      <p className="whitespace-pre-line break-words text-ink">{hint}</p>
    </div>
  );
}
