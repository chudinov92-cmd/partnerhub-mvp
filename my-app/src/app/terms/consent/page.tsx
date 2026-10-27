import type { Metadata } from "next";
import { LegalDocumentPage } from "@/components/legal/LegalDocumentPage";
import consent from "@/data/legal/consent.json";

export const metadata: Metadata = {
  title: "Согласие на обработку персональных данных — Zeip",
  description:
    "Согласие посетителя сайта на обработку персональных данных ООО «ЗЕИП».",
};

export default function ConsentPage() {
  return (
    <LegalDocumentPage title={consent.title} paragraphs={consent.paragraphs} />
  );
}
