import type { Metadata } from "next";
import { Hind_Siliguri } from "next/font/google";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { THEME_INIT_SCRIPT } from "@/features/theme/init-script";
import "./globals.css";

// Self-hosted: next/font downloads the files at build time and serves them from
// our own domain, so visitors' browsers never contact Google.
const hindSiliguri = Hind_Siliguri({
  weight: ["400", "500", "600", "700"],
  subsets: ["bengali", "latin"],
  display: "swap",
  variable: "--font-hind-siliguri",
});

export const metadata: Metadata = {
  title: "Learn English by stories",
  description: "গল্প পড়ে সহজে ইংরেজি শিখুন — বাংলাভাষীদের জন্য।",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: the inline script may set data-theme before React hydrates.
    <html lang="bn" className={`${hindSiliguri.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        {/* Static constant string, nothing interpolated: the only allowed dangerouslySetInnerHTML. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
