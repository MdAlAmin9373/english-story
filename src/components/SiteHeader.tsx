import Link from "next/link";
import { Suspense } from "react";
import { HeaderAuth } from "@/features/auth/components/HeaderAuth";

// Items without href are placeholders until those routes exist;
// they are hidden on phones to leave room for the login button.
const navItems: { label: string; href?: string }[] = [
  { label: "হোম", href: "/" },
  { label: "গল্প", href: "/stories" },
  { label: "শব্দভান্ডার" },
  { label: "কুইজ" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-navy-800 bg-navy-900/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/" className="shrink-0 text-lg font-bold text-accent">
          English Story
        </Link>
        <div className="flex items-center gap-3 sm:gap-6">
          <nav aria-label="প্রধান মেনু">
            <ul className="flex items-center gap-3 text-sm text-ink-muted sm:gap-6 sm:text-base">
              {navItems.map((item) =>
                item.href ? (
                  <li key={item.label}>
                    <Link href={item.href} className="hover:text-accent">
                      {item.label}
                    </Link>
                  </li>
                ) : (
                  <li key={item.label} className="hidden sm:block">
                    <span>{item.label}</span>
                  </li>
                ),
              )}
            </ul>
          </nav>
          {/* Fallback keeps the button's footprint so the header doesn't shift. */}
          <Suspense fallback={<span aria-hidden className="block h-8 w-16" />}>
            <HeaderAuth />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
