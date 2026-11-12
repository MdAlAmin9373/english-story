import type { Metadata } from "next";
import { LegalPage } from "@/features/legal/components/LegalPage";
import { TERMS } from "@/features/legal/content";

export const metadata: Metadata = { title: TERMS.metaTitle, description: TERMS.description };

export default function TermsPage() {
  return <LegalPage doc={TERMS} />;
}
