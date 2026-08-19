"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchPaywallFunnel,
  type PaywallFunnelData,
} from "@/services/analyticsService";

const EVENT_LABELS: Record<string, string> = {
  shown: "Показ пейвола",
  dismissed: "Закрыли",
  cta_buy: "CTA «Выбрать тариф»",
  trial_start: "Старт trial",
  checkout_started: "Переход к оплате",
  payment_success: "Успешная оплата",
};

function formatPct(value: number | null): string {
  if (value == null) return "—";
  return `${value.toFixed(1)}%`;
}

type PaywallFunnelAnalyticsProps = {
  from: string;
  to: string;
  refreshKey: number;
};

export function PaywallFunnelAnalytics({
  from,
  to,
  refreshKey,
}: PaywallFunnelAnalyticsProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PaywallFunnelData | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchPaywallFunnel({ from, to });
      setData(result);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Не удалось загрузить воронку пейвола.",
      );
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-slate-900">
          Воронка пейвола
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          События из paywall_events за период {from} → {to}. Только
          авторизованные пользователи.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Загрузка…</p>
      ) : error ? (
        <p className="text-sm font-medium text-rose-700">{error}</p>
      ) : data ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold text-slate-600">
                Конверсия shown → CTA
              </div>
              <div className="mt-2 text-2xl font-bold tabular-nums text-slate-900">
                {formatPct(data.shownToCtaPct)}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold text-slate-600">
                Конверсия shown → оплата
              </div>
              <div className="mt-2 text-2xl font-bold tabular-nums text-slate-900">
                {formatPct(data.shownToPaidPct)}
              </div>
            </div>
          </div>

          {data.steps.length === 0 ? (
            <p className="text-sm text-slate-500">
              Нет событий за выбранный период.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-600">
                  <tr>
                    <th className="px-3 py-2">Шаг</th>
                    <th className="px-3 py-2 text-right">События</th>
                    <th className="px-3 py-2 text-right">Уник. пользователи</th>
                  </tr>
                </thead>
                <tbody>
                  {data.steps.map((step) => (
                    <tr
                      key={step.event_type}
                      className="border-t border-slate-100"
                    >
                      <td className="px-3 py-2 text-slate-900">
                        {EVENT_LABELS[step.event_type] ?? step.event_type}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums font-medium text-slate-900">
                        {step.cnt}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-700">
                        {step.unique_users}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {data.intents.length > 0 ? (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-slate-800">
                Intent при показе пейвола
              </h3>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-600">
                    <tr>
                      <th className="px-3 py-2">Intent</th>
                      <th className="px-3 py-2 text-right">Показов</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.intents.map((row) => (
                      <tr
                        key={row.intent}
                        className="border-t border-slate-100"
                      >
                        <td className="px-3 py-2 text-slate-900">
                          {row.intent}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums font-medium text-slate-900">
                          {row.shown_cnt}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-slate-500">Нет данных.</p>
      )}
    </div>
  );
}
