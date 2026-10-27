import type { Metadata } from "next";
import { LegalDocumentPage } from "@/components/legal/LegalDocumentPage";
import userAgreement from "@/data/legal/user-agreement.json";

export const metadata: Metadata = {
  title: "Пользовательское соглашение — Zeip",
  description: "Пользовательское соглашение сервиса Zeip.",
};

export default function UserAgreementPage() {
  return (
    <LegalDocumentPage
      title={userAgreement.title}
      paragraphs={userAgreement.paragraphs}
    />
  );
}
