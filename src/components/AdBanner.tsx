"use client";

/** Заглушка рекламного блока для тарифа Free (заменить на реальный ad-tag). */
export function AdBanner() {
  return (
    <div
      className="mx-4 mb-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-center"
      role="complementary"
      aria-label="Рекламный блок"
    >
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
        Реклама
      </p>
      <p className="mt-1 text-xs text-slate-600">
        Здесь будет рекламный блок. На тарифе Pro реклама не показывается.
      </p>
      <a
        href="/subscription"
        className="mt-2 inline-block text-xs font-medium text-emerald-600 hover:underline"
      >
        Убрать рекламу — оформить Pro
      </a>
    </div>
  );
}
