import Link from "next/link";
import type { ReactNode } from "react";
import { LegalDocumentContent } from "@/components/legal/LegalDocumentContent";

type LegalDocumentPageProps = {
  title: string;
  paragraphs: string[];
  backHref?: string;
  backLabel?: string;
  intro?: ReactNode;
};

export function LegalDocumentPage({
  title,
  paragraphs,
  backHref = "/terms",
  backLabel = "← Условия",
  intro,
}: LegalDocumentPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-emerald-50/30 to-emerald-50/30 px-4 py-8">
      <article className="mx-auto max-w-2xl rounded-2xl border border-gray-200 bg-white p-6 shadow-lg sm:p-8">
        <Link
          href={backHref}
          className="inline-flex items-center text-sm font-medium text-[#009966] hover:text-[#008855] hover:underline"
        >
          {backLabel}
        </Link>

        {intro ? <div className="mt-4">{intro}</div> : null}

        <h1 className="mt-4 text-2xl font-semibold text-slate-900">{title}</h1>

        <LegalDocumentContent title={title} paragraphs={paragraphs} />
      </article>
    </div>
  );
}
