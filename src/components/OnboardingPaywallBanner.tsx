"use client";

import {
  useEffect,
  useRef,
  type HTMLAttributes,
  type ReactNode,
  type RefObject,
} from "react";
import { useRouter } from "next/navigation";
import { PIN_COLOR_PRO_PLUS } from "@/lib/subscriptionPlans";
import { reachYandexMetrikaGoal } from "@/lib/yandexMetrika";

const PAYWALL_BANNER_HEIGHT_VAR = "--zeip-paywall-banner-height";

const BANNER_POSITION_CLASS =
  "fixed inset-x-0 bottom-[calc(var(--zeip-mobile-nav-height,3.5rem)+env(safe-area-inset-bottom,0px))] z-[1250] px-4 py-5 lg:absolute lg:inset-x-0 lg:bottom-0 lg:px-6 lg:py-4";

function syncBannerHeight(el: HTMLElement) {
  document.documentElement.style.setProperty(
    PAYWALL_BANNER_HEIGHT_VAR,
    `${el.offsetHeight}px`,
  );
}

function clearBannerHeight() {
  document.documentElement.style.setProperty(PAYWALL_BANNER_HEIGHT_VAR, "0px");
}

function useBannerHeight(bannerRef: RefObject<HTMLDivElement | null>) {
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
  }, [bannerRef]);
}

function BannerShell({
  children,
  interactive,
  className,
  ...rest
}: {
  children: ReactNode;
  interactive: boolean;
} & HTMLAttributes<HTMLDivElement>) {
  const bannerRef = useRef<HTMLDivElement>(null);
  useBannerHeight(bannerRef);

  return (
    <div
      ref={bannerRef}
      className={`${BANNER_POSITION_CLASS} ${
        interactive ? "pointer-events-auto" : "pointer-events-none"
      }${className ? ` ${className}` : ""}`}
      {...rest}
      style={{ backgroundColor: PIN_COLOR_PRO_PLUS }}
    >
      {children}
    </div>
  );
}

function PaywallBannerLiveContent() {
  const router = useRouter();

  return (
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
        className="shrink-0 cursor-pointer rounded-xl bg-[#10B981] px-5 py-2 text-sm font-semibold text-white shadow-sm transition-[color,background-color,transform,box-shadow] hover:bg-emerald-600 hover:shadow-md active:scale-[0.98] active:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
      >
        Тарифы
      </button>
    </div>
  );
}

function PaywallBannerSkeletonContent() {
  return (
    <div className="flex flex-col items-center gap-3 md:flex-row md:justify-between md:gap-4">
      <div className="h-7 w-48 max-w-[70%] rounded-md bg-white/25" />
      <div className="h-9 w-[5.5rem] rounded-xl bg-white/25" />
    </div>
  );
}

export function OnboardingPaywallBannerSlot({
  ready,
  visible,
}: {
  ready: boolean;
  visible: boolean;
}) {
  if (ready && !visible) {
    return null;
  }

  return (
    <BannerShell
      interactive={ready}
      role={ready ? "region" : "status"}
      aria-label={ready ? "Подписка Zeip" : "Загрузка баннера подписки"}
      aria-busy={!ready}
    >
      {ready ? <PaywallBannerLiveContent /> : <PaywallBannerSkeletonContent />}
    </BannerShell>
  );
}

export function OnboardingPaywallBanner() {
  return <OnboardingPaywallBannerSlot ready visible />;
}
