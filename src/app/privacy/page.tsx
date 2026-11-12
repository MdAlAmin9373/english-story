import type { Metadata } from "next";
import { LegalPage } from "@/features/legal/components/LegalPage";
import { PRIVACY } from "@/features/legal/content";

export const metadata: Metadata = { title: PRIVACY.metaTitle, description: PRIVACY.description };

export default function PrivacyPage() {
  return <LegalPage doc={PRIVACY} />;
}
