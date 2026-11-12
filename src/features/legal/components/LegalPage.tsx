import Link from "next/link";
import type { ReactNode } from "react";
import { LEGAL_UPDATED, type Block, type Inline, type LegalDoc } from "../content";

const linkClass = "text-accent underline underline-offset-2 hover:no-underline";

function renderInline(parts: Inline[]): ReactNode[] {
  return parts.map((part, i) => {
    if (typeof part === "string") return part;
    if ("b" in part) {
      return (
        <strong key={i} className="font-semibold text-ink">
          {part.b}
        </strong>
      );
    }
    return part.href.startsWith("/") ? (
      <Link key={i} href={part.href} className={linkClass}>
        {part.text}
      </Link>
    ) : (
      <a key={i} href={part.href} className={linkClass}>
        {part.text}
      </a>
    );
  });
}

function renderBlock(block: Block, i: number): ReactNode {
  if ("h3" in block) {
    return (
      <h3 key={i} className="pt-2 text-lg font-semibold text-ink">
        {block.h3}
      </h3>
    );
  }
  if ("p" in block) return <p key={i}>{renderInline(block.p)}</p>;
  return (
    <ul key={i} className="flex list-disc flex-col gap-1 ps-6">
      {block.ul.map((item, j) => (
        <li key={j}>{renderInline(item)}</li>
      ))}
    </ul>
  );
}

// Static, public page: no cookies or database, so it is prerendered.
export function LegalPage({ doc }: { doc: LegalDoc }) {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 break-words sm:px-6">
      <article className="flex flex-col gap-8 leading-relaxed text-ink-muted">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold text-ink">{doc.heading}</h1>
          <p className="text-sm">সর্বশেষ হালনাগাদ: {LEGAL_UPDATED}</p>
        </header>

        <nav aria-label="সূচিপত্র" className="rounded-lg border border-line bg-surface p-4">
          <p className="mb-2 font-semibold text-ink">সূচিপত্র</p>
          <ol className="flex flex-col gap-1">
            {doc.sections.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className={linkClass}>
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {doc.sections.map((s) => (
          <section key={s.id} id={s.id} aria-labelledby={`${s.id}-title`} className="flex scroll-mt-20 flex-col gap-3">
            <h2 id={`${s.id}-title`} className="text-xl font-bold text-ink">
              {s.title}
            </h2>
            {s.blocks.map(renderBlock)}
          </section>
        ))}
      </article>
    </main>
  );
}
