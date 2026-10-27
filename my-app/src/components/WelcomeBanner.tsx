"use client";

import Link from "next/link";

type WelcomeBannerProps = {
  onDismiss: () => void;
};

export function WelcomeBanner({ onDismiss }: WelcomeBannerProps) {
  return (
    <div className="shrink-0 border-b border-emerald-200 bg-emerald-50 px-4 py-3">
      <p className="mb-2 text-sm font-medium text-emerald-900">
        Привет! Пара шагов, чтобы появиться на карте:
      </p>
      <div className="flex flex-wrap gap-2">
        <Link
          href="/profile#section-city"
          className="rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs font-medium text-emerald-800 hover:bg-emerald-100"
        >
          1. Укажи город →
        </Link>
        <Link
          href="/profile#section-skills"
          className="rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs font-medium text-emerald-800 hover:bg-emerald-100"
        >
          2. Добавь навыки →
        </Link>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="mt-2 text-xs text-emerald-600 hover:text-emerald-800"
        aria-label="Закрыть приветствие"
      >
        Закрыть
      </button>
    </div>
  );
}
