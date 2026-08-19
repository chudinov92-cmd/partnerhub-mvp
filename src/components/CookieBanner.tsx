"use client";

import { useEffect, useRef, useState } from "react";
import {
  COOKIE_CONSENT_KEY,
  COOKIE_CONSENT_ACCEPTED_EVENT,
  COOKIE_POLICY_VERSION,
  getOrCreateAnonymousUid,
  hasCookieConsentAccepted,
} from "@/lib/cookieConsent";
import { initYandexMetrika } from "@/lib/yandexMetrika";
import { initVkPixel } from "@/lib/vkPixel";

const COOKIE_BANNER_HEIGHT_VAR = "--cookie-banner-height";
const LANDING_FOOTER_SELECTOR = "footer.footer";

function syncBannerHeight(el: HTMLElement) {
  document.documentElement.style.setProperty(
    COOKIE_BANNER_HEIGHT_VAR,
    `${el.offsetHeight}px`,
  );
}

function clearBannerHeight() {
  document.documentElement.style.removeProperty(COOKIE_BANNER_HEIGHT_VAR);
}

function syncBannerBottom(bannerEl: HTMLElement) {
  const footer = document.querySelector(LANDING_FOOTER_SELECTOR);
  if (!footer) {
    bannerEl.style.bottom = "0px";
    return;
  }

  const footerTop = footer.getBoundingClientRect().top;
  const lift = Math.max(0, window.innerHeight - footerTop);
  bannerEl.style.bottom = `${lift}px`;
}

export function CookieBanner() {
  const bannerRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    getOrCreateAnonymousUid();
    setVisible(!hasCookieConsentAccepted());
  }, []);

  useEffect(() => {
    if (!visible) return;

    const el = bannerRef.current;
    if (!el) return;

    document.documentElement.setAttribute("data-cookie-banner", "open");

    syncBannerHeight(el);
    syncBannerBottom(el);

    const ro = new ResizeObserver(() => {
      syncBannerHeight(el);
      syncBannerBottom(el);
    });
    ro.observe(el);

    let rafId = 0;
    const scheduleSync = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        syncBannerBottom(el);
      });
    };

    window.addEventListener("scroll", scheduleSync, { passive: true });
    window.addEventListener("resize", scheduleSync, { passive: true });

    return () => {
      ro.disconnect();
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", scheduleSync);
      window.removeEventListener("resize", scheduleSync);
      el.style.bottom = "";
      document.documentElement.removeAttribute("data-cookie-banner");
      clearBannerHeight();
    };
  }, [visible]);

  const handleAccept = async () => {
    if (typeof window === "undefined" || submitting) return;

    setSubmitting(true);
    try {
      const anonymousUid = getOrCreateAnonymousUid();
      const response = await fetch("/api/v1/privacy/cookie-consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          anonymous_uid: anonymousUid,
          policy_version: COOKIE_POLICY_VERSION,
          consent_type: "all",
        }),
      });

      if (!response.ok) {
        throw new Error("Не удалось сохранить согласие");
      }

      window.localStorage.setItem(COOKIE_CONSENT_KEY, "accepted");
      initYandexMetrika();
      initVkPixel();
      window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_ACCEPTED_EVENT));
      setVisible(false);
    } catch {
      // Баннер остаётся открытым — повторный клик отправит запрос снова.
    } finally {
      setSubmitting(false);
    }
  };

  if (!visible) return null;

  return (
    <div
      ref={bannerRef}
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
            Мы используем{" "}
            <a
              href="/terms/cookies"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-[#009966] underline underline-offset-2 hover:text-[#008855]"
            >
              cookie
            </a>{" "}
            для работы сервиса, аналитики (Яндекс.Метрика)
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
          onClick={() => void handleAccept()}
          disabled={submitting}
          className="inline-flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-[#009966] to-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:from-[#009966] hover:to-emerald-700 disabled:opacity-60"
        >
          {submitting ? "Сохраняем..." : "Согласен"}
        </button>
      </div>
    </div>
  );
}
