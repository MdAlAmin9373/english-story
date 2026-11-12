import Link from "next/link";
import { SUPPORT_EMAIL } from "@/features/legal/content";

const linkClass = "hover:text-accent";

// Static: shown on every page (including admin) from the root layout.
// Wraps onto several lines on narrow phones (360px).
export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-2 gap-y-1 px-4 py-4 text-center text-sm text-ink-muted sm:px-6">
        <span>© ২০২৬ English Story</span>
        <span aria-hidden="true">·</span>
        <Link href="/privacy" className={linkClass}>
          গোপনীয়তা নীতি
        </Link>
        <span aria-hidden="true">·</span>
        <Link href="/terms" className={linkClass}>
          শর্তাবলী
        </Link>
        <span aria-hidden="true">·</span>
        <a href={`mailto:${SUPPORT_EMAIL}`} className={`${linkClass} break-words`}>
          {SUPPORT_EMAIL}
        </a>
      </div>
    </footer>
  );
}
