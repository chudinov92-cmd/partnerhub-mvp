"use client";

import { useEffect, useState } from "react";

const COOKIE_CONSENT_KEY = "cookie_consent";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const accepted = window.localStorage.getItem(COOKIE_CONSENT_KEY) === "accepted";
    setVisible(!accepted);
  }, []);

  const handleAccept = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(COOKIE_CONSENT_KEY, "accepted");
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-labelledby="cookie-banner-title"
      aria-describedby="cookie-banner-description"
      className="fixed inset-x-0 bottom-0 z-[1900] border-t border-slate-200 bg-white/95 px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] shadow-[0_-8px_30px_rgba(15,23,42,0.12)] backdrop-blur"
    >
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p
            id="cookie-banner-title"
            className="text-sm font-semibold text-slate-900"
          >
            Мы используем cookie
          </p>
          <p
            id="cookie-banner-description"
            className="mt-1 text-sm leading-snug text-slate-600"
          >
            Мы используем cookie для работы сервиса, аналитики (Яндекс.Метрика)
            и показа рекламы (ВКонтакте). Продолжая использовать сайт, вы
            соглашаетесь с{" "}
            <a
              href="/personal-data"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-[#009966] underline underline-offset-2 hover:text-[#008855]"
            >
              Политикой конфиденциальности
            </a>
            .
          </p>
        </div>
        <button
          type="button"
          onClick={handleAccept}
          className="inline-flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-[#009966] to-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:from-[#009966] hover:to-emerald-700"
        >
          Принять
        </button>
      </div>
    </div>
  );
}
