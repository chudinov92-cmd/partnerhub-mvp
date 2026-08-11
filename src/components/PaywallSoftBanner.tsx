"use client";

type PaywallSoftBannerProps = {
  onOpenPaywall: () => void;
  onDismiss: () => void;
};

export function PaywallSoftBanner({ onOpenPaywall, onDismiss }: PaywallSoftBannerProps) {
  return (
    <div className="shrink-0 border-b border-amber-200 bg-amber-50/95 px-4 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate-700">
          Участие в сети Zeip — <span className="font-medium">249 ₽ / 30 дней</span>
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenPaywall}
            className="rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:from-emerald-600 hover:to-emerald-700"
          >
            Оформить
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="text-xs font-medium text-slate-500 hover:text-slate-700"
            aria-label="Закрыть"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
