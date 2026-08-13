"use client";

type OnboardingPaywallBannerProps = {
  onBuy: () => void;
};

export function OnboardingPaywallBanner({ onBuy }: OnboardingPaywallBannerProps) {
  return (
    <div
      className="pointer-events-auto fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] z-[1800] border-t border-emerald-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur md:bottom-4 md:mx-auto md:max-w-lg md:rounded-2xl md:border"
      role="region"
      aria-label="Подписка Zeip"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-900">
          Доступ ко всем функциям —{" "}
          <span className="text-emerald-700">249 ₽/мес</span>
        </p>
        <button
          type="button"
          onClick={onBuy}
          className="shrink-0 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:from-emerald-600 hover:to-emerald-700"
        >
          Купить
        </button>
      </div>
    </div>
  );
}
