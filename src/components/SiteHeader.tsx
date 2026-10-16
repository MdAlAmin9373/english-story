import Link from "next/link";

// Items without href are placeholders until those routes exist.
const navItems: { label: string; href?: string }[] = [
  { label: "গল্প", href: "/stories" },
  { label: "শব্দভান্ডার" },
  { label: "কুইজ" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-navy-800 bg-navy-900/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="text-lg font-bold text-accent">
          English Story
        </Link>
        <nav aria-label="প্রধান মেনু">
          <ul className="flex items-center gap-3 text-sm text-ink-muted sm:gap-6 sm:text-base">
            {navItems.map((item) => (
              <li key={item.label}>
                {item.href ? (
                  <Link href={item.href} className="hover:text-accent">
                    {item.label}
                  </Link>
                ) : (
                  <span>{item.label}</span>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
