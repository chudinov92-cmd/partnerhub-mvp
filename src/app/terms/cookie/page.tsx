import type { Metadata } from "next";
import { LegalDocumentPage } from "@/components/legal/LegalDocumentPage";
import cookie from "@/data/legal/cookie.json";

export const metadata: Metadata = {
  title: "Условия обработки cookie-файлов — Zeip",
  description:
    "Условия обработки cookie-файлов на сайте zeip.ru: категории, цели, управление и отзыв согласия.",
};

export default function CookiePolicyPage() {
  return (
    <LegalDocumentPage title={cookie.title} paragraphs={cookie.paragraphs} />
  );
}
