import type { Metadata } from "next";
import { LegalDocumentPage } from "@/components/legal/LegalDocumentPage";
import consent from "@/data/legal/consent.json";

export const metadata: Metadata = {
  title: "Согласие на обработку персональных данных — Zeip",
  description:
    "Согласие на обработку персональных данных ООО «ЗЕИП» в соответствии с Федеральным законом № 152-ФЗ.",
};

export default function PersonalDataConsentPage() {
  return (
    <LegalDocumentPage
      title={consent.title}
      paragraphs={consent.paragraphs}
      backHref="/auth"
      backLabel="← Назад"
    />
  );
}
