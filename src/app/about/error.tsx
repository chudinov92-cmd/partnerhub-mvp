"use client";

import { useEffect } from "react";

export default function AboutError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-10 sm:px-6 sm:py-14">
      <div className="mx-auto max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-lg font-bold text-slate-900">Не удалось открыть страницу</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Произошла ошибка при загрузке /about. Попробуй обновить страницу или повторить ещё раз.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70 focus-visible:ring-offset-2"
          >
            Повторить
          </button>
          <a
            href="/"
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70 focus-visible:ring-offset-2"
          >
            На карту
          </a>
        </div>

        {error.digest ? (
          <p className="mt-5 text-xs text-slate-500">
            Код ошибки: <span className="font-mono">{error.digest}</span>
          </p>
        ) : null}
      </div>
    </div>
  );
}

