"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { PIN_COLOR_FREE, PIN_COLOR_PRO_PLUS } from "@/lib/subscriptionPlans";
import { reachYandexMetrikaGoal } from "@/lib/yandexMetrika";

const PAYWALL_BANNER_HEIGHT_VAR = "--zeip-paywall-banner-height";

function syncBannerHeight(el: HTMLElement) {
  document.documentElement.style.setProperty(
    PAYWALL_BANNER_HEIGHT_VAR,
    `${el.offsetHeight}px`,
  );
}

function clearBannerHeight() {
  document.documentElement.style.setProperty(PAYWALL_BANNER_HEIGHT_VAR, "0px");
}

export function OnboardingPaywallBanner() {
  const router = useRouter();
  const bannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = bannerRef.current;
    if (!el) return;

    syncBannerHeight(el);

    const observer = new ResizeObserver(() => {
      syncBannerHeight(el);
    });
    observer.observe(el);

    return () => {
      observer.disconnect();
      clearBannerHeight();
    };
  }, []);

  return (
    <div
      ref={bannerRef}
      className="pointer-events-auto fixed inset-x-0 bottom-[calc(var(--zeip-mobile-nav-height,3.5rem)+env(safe-area-inset-bottom,0px))] z-[1250] px-4 py-5 lg:absolute lg:inset-x-0 lg:bottom-0 lg:px-6 lg:py-4"
      style={{ backgroundColor: PIN_COLOR_PRO_PLUS }}
      role="region"
      aria-label="Подписка Zeip"
    >
      <div className="flex flex-col items-center gap-3 md:flex-row md:justify-between md:gap-4">
        <p className="text-center text-lg font-semibold italic text-white md:text-left">
          Открыть полный доступ
        </p>
        <button
          type="button"
          onClick={() => {
            reachYandexMetrikaGoal("banner_map_cta");
            router.push("/subscription");
          }}
          className="shrink-0 rounded-xl px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
          style={{ backgroundColor: PIN_COLOR_FREE }}
        >
          Тарифы
        </button>
      </div>
    </div>
  );
}
