import type { Metadata } from "next";
import { LegalDocumentPage } from "@/components/legal/LegalDocumentPage";
import privacy from "@/data/legal/privacy.json";

export const metadata: Metadata = {
  title: "Политика обработки персональных данных — Zeip",
  description:
    "Политика ООО «ЗЕИП» в отношении обработки персональных данных посетителей сайта.",
};

export default function PrivacyPolicyPage() {
  return (
    <LegalDocumentPage title={privacy.title} paragraphs={privacy.paragraphs} />
  );
}
