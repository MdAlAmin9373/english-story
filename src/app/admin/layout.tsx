import type { Metadata } from "next";
import Link from "next/link";

// Static shell only: every admin page checks requireAdmin() itself,
// because a layout does not re-run on client navigation.
export const metadata: Metadata = {
  title: "অ্যাডমিন — English Story",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <Link href="/admin" className="text-sm font-semibold text-accent">
        অ্যাডমিন প্যানেল
      </Link>
      {children}
    </main>
  );
}
