"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchRevenueMetrics,
  type RevenueMetricsData,
} from "@/services/analyticsService";

type RevenueAnalyticsProps = {
  refreshKey: number;
};

function formatRub(value: number): string {
  return `${Math.round(value).toLocaleString("ru-RU")} ₽`;
}

function formatDateLabel(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00.000Z`);
  return d.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

function MrrChart({ series }: { series: RevenueMetricsData["series"] }) {
  const width = 720;
  const height = 220;
  const padX = 8;
  const padY = 16;

  const points = useMemo(() => {
    if (series.length === 0) return [];
    const values = series.map((row) => row.mrrRub);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = Math.max(max - min, 1);
    const innerW = width - padX * 2;
    const innerH = height - padY * 2;

    return series.map((row, index) => {
      const x =
        series.length === 1
          ? width / 2
          : padX + (index / (series.length - 1)) * innerW;
      const y = padY + innerH - ((row.mrrRub - min) / span) * innerH;
      return { x, y, row };
    });
  }, [series]);

  if (points.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        Нет снапшотов MRR. После наката SQL появится строка за вчера.
      </p>
    );
  }

  const linePath = points
    .map((point, index) =>
      `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`,
    )
    .join(" ");

  const areaPath = `${linePath} L ${points[points.length - 1]?.x.toFixed(1)} ${height - padY} L ${points[0]?.x.toFixed(1)} ${height - padY} Z`;

  const latest = series[series.length - 1];
  const first = series[0];

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2 text-xs text-slate-500">
        <span>
          {formatDateLabel(first.snapshotDate)} →{" "}
          {formatDateLabel(latest.snapshotDate)} (UTC)
        </span>
        <span className="font-semibold text-slate-700">
          Сейчас: {formatRub(latest.mrrRub)}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-56 w-full"
        role="img"
        aria-label="График MRR за последние 60 дней"
      >
        <defs>
          <linearGradient id="mrrAreaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.03" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#mrrAreaFill)" />
        <path
          d={linePath}
          fill="none"
          stroke="#059669"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {points.map((point) => (
          <circle
            key={point.row.snapshotDate}
            cx={point.x}
            cy={point.y}
            r="3"
            fill="#047857"
          />
        ))}
      </svg>
    </div>
  );
}

export function RevenueAnalytics({ refreshKey }: RevenueAnalyticsProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<RevenueMetricsData | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchRevenueMetrics();
      setData(result);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Не удалось загрузить revenue-метрики.",
      );
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const yesterday = data?.yesterday;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-slate-900">Revenue</h2>
        <p className="mt-1 text-sm text-slate-600">
          MRR, активные подписки и отток. Снапшоты из mrr_snapshots (UTC),
          ежедневно в 03:00.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Загрузка…</p>
      ) : error ? (
        <p className="text-sm font-medium text-rose-700">{error}</p>
      ) : data ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold text-slate-600">
                Активных Pro
              </div>
              <div className="mt-2 text-2xl font-bold tabular-nums text-slate-900">
                {yesterday?.activePro ?? 0}
              </div>
              <div className="mt-1 text-xs text-slate-500">На конец вчера</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold text-slate-600">
                Активных Pro+
              </div>
              <div className="mt-2 text-2xl font-bold tabular-nums text-slate-900">
                {yesterday?.activeProPlus ?? 0}
              </div>
              <div className="mt-1 text-xs text-slate-500">На конец вчера</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold text-slate-600">
                Новых вчера
              </div>
              <div className="mt-2 text-2xl font-bold tabular-nums text-slate-900">
                {yesterday?.newCustomers ?? 0}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Первые paid-платежи
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold text-slate-600">Отток</div>
              <div className="mt-2 text-2xl font-bold tabular-nums text-slate-900">
                {yesterday?.churned ?? 0}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                pro_expires_at вчера, без продления
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold text-slate-600">
                MRR вчера
              </div>
              <div className="mt-2 text-2xl font-bold tabular-nums text-slate-900">
                {formatRub(yesterday?.mrrRub ?? 0)}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Pro×249 + Pro+×449
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold text-slate-600">LTV ₽</div>
              <div className="mt-2 text-2xl font-bold tabular-nums text-slate-900">
                {formatRub(data.ltv.avgLtvRub)}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                ~{data.ltv.avgPaymentsPerUser.toFixed(1)} платежей на клиента
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
              MRR за 60 дней
            </div>
            <MrrChart series={data.series} />
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate-500">Нет данных.</p>
      )}
    </div>
  );
}
