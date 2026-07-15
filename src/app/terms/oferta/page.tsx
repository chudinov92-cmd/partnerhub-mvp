import type { Metadata } from "next";
import { LegalDocumentPage } from "@/components/legal/LegalDocumentPage";
import oferta from "@/data/legal/oferta.json";

export const metadata: Metadata = {
  title: "Публичная оферта — Zeip",
  description: "Публичная оферта на оплату подписки Pro через Robokassa.",
};

export default function OfertaPage() {
  return (
    <LegalDocumentPage title={oferta.title} paragraphs={oferta.paragraphs} />
  );
}
