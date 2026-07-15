import type { Metadata } from "next";
import { LegalDocumentPage } from "@/components/legal/LegalDocumentPage";
import confidentiality from "@/data/legal/confidentiality.json";

export const metadata: Metadata = {
  title: "Соглашение о конфиденциальности — Zeip",
  description:
    "Соглашение о соблюдении конфиденциальности персональных данных ООО «ЗЕИП».",
};

export default function ConfidentialityPage() {
  return (
    <LegalDocumentPage
      title={confidentiality.title}
      paragraphs={confidentiality.paragraphs}
    />
  );
}
