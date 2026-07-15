import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Условия использования — Zeip",
  description:
    "Юридические документы сервиса Zeip: пользовательское соглашение, политика конфиденциальности, согласие на обработку персональных данных, публичная оферта.",
};

const DOCUMENTS = [
  {
    href: "/terms/agreement",
    title: "Пользовательское соглашение",
    description: "Правила использования сервиса Zeip",
  },
  {
    href: "/terms/privacy",
    title: "Политика обработки персональных данных",
    description: "Как мы обрабатываем персональные данные посетителей сайта",
  },
  {
    href: "/terms/consent",
    title: "Согласие на обработку персональных данных",
    description: "Согласие посетителя сайта на обработку персональных данных",
  },
  {
    href: "/terms/confidentiality",
    title: "Соглашение о конфиденциальности",
    description: "Соблюдение конфиденциальности персональных данных",
  },
  {
    href: "/terms/oferta",
    title: "Публичная оферта",
    description: "Условия оплаты подписки Pro через Robokassa",
  },
] as const;

export default function TermsIndexPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-emerald-50/30 to-emerald-50/30 px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/"
          className="inline-flex items-center text-sm font-medium text-[#009966] hover:text-[#008855] hover:underline"
        >
          ← На главную
        </Link>

        <h1 className="mt-4 text-2xl font-semibold text-slate-900">
          Условия использования
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          ООО «ЗЕИП» · ИНН 5906189643 · ОГРН 1265900008494
        </p>

        <ul className="mt-6 space-y-3">
          {DOCUMENTS.map((doc) => (
            <li key={doc.href}>
              <Link
                href={doc.href}
                className="block rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-emerald-200 hover:shadow-md"
              >
                <span className="text-base font-medium text-slate-900">
                  {doc.title}
                </span>
                <span className="mt-1 block text-sm text-slate-600">
                  {doc.description}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
