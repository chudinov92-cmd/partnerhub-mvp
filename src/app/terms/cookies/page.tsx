import type { Metadata } from "next";
import { LegalDocumentPage } from "@/components/legal/LegalDocumentPage";
import { CookieRegistryTable } from "@/components/legal/CookieRegistryTable";
import cookie from "@/data/legal/cookie.json";
import { COOKIE_POLICY_VERSION } from "@/lib/cookieConsent";
import { VK_PIXEL_ID } from "@/lib/vkPixel";
import { YANDEX_METRIKA_ID } from "@/lib/yandexMetrika";

type CookiePolicyDocument = typeof cookie & { version: string };

const cookieDoc = cookie as CookiePolicyDocument;

if (cookieDoc.version !== COOKIE_POLICY_VERSION) {
  throw new Error(
    `cookie.json version mismatch: ${cookieDoc.version} vs ${COOKIE_POLICY_VERSION}`,
  );
}

export const metadata: Metadata = {
  title: "Реестр cookie и локальных хранилищ — Zeip",
  description:
    "Полный перечень cookie, localStorage, sessionStorage и журнала согласий на сайте zeip.ru: категории, сроки хранения, необходимость согласия.",
};

export default function CookiesRegistryPage() {
  return (
    <LegalDocumentPage
      title={cookieDoc.title}
      paragraphs={cookieDoc.paragraphs}
      intro={
        <div className="space-y-4">
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-3 text-sm text-slate-700">
            <p>
              <span className="font-medium text-slate-900">Версия реестра:</span>{" "}
              {cookieDoc.version}
            </p>
            <p className="mt-1">
              <span className="font-medium text-slate-900">Счётчики:</span> Яндекс.Метрика{" "}
              {YANDEX_METRIKA_ID}, VK Pixel {VK_PIXEL_ID}
            </p>
          </div>

          <CookieRegistryTable />

          <p className="text-xs text-slate-500">
            Ниже — полный текст условий обработки cookie-файлов и аналогичных технологий.
          </p>
        </div>
      }
    />
  );
}
