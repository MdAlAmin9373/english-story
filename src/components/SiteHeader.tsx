import Link from "next/link";

const navItems = ["গল্প", "শব্দভান্ডার", "কুইজ"];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-navy-800 bg-navy-900/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="text-lg font-bold text-accent">
          English Story
        </Link>
        <nav aria-label="প্রধান মেনু">
          <ul className="flex items-center gap-3 text-sm text-ink-muted sm:gap-6 sm:text-base">
            {/* Placeholders until these routes exist */}
            {navItems.map((item) => (
              <li key={item}>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
