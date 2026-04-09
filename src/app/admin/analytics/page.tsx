"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { AdminShell } from "@/app/admin/AdminShell";

type MetricCardProps = {
  title: string;
  value: string;
  hint?: string;
};

function MetricCard({ title, value, hint }: MetricCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-semibold text-slate-600">{title}</div>
      <div className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">
        {value}
      </div>
      {hint ? <div className="mt-1 text-xs text-slate-500">{hint}</div> : null}
    </div>
  );
}

function toDateInputValue(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function AdminAnalyticsPage() {
  const today = useMemo(() => new Date(), []);
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return toDateInputValue(d);
  });
  const [to, setTo] = useState(() => toDateInputValue(today));

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<{
    profilesTotal: number;
    profilesActive2m: number;
    postsInRange: number;
    messagesInRange: number;
    reportsNew: number;
    reportsResolved: number;
  } | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const fromIso = new Date(`${from}T00:00:00.000Z`).toISOString();
      const toIso = new Date(`${to}T23:59:59.999Z`).toISOString();
      const activeCutoff = new Date(Date.now() - 2 * 60 * 1000).toISOString();

      const [
        profilesTotalRes,
        profilesActiveRes,
        postsRes,
        messagesRes,
        reportsNewRes,
        reportsResolvedRes,
      ] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .gte("last_seen_at", activeCutoff),
        supabase
          .from("posts")
          .select("id", { count: "exact", head: true })
          .gte("created_at", fromIso)
          .lte("created_at", toIso),
        supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .gte("created_at", fromIso)
          .lte("created_at", toIso),
        supabase
          .from("abuse_reports")
          .select("id", { count: "exact", head: true })
          .eq("status", "new"),
        supabase
          .from("abuse_reports")
          .select("id", { count: "exact", head: true })
          .eq("status", "resolved"),
      ]);

      const anyErr =
        profilesTotalRes.error ||
        profilesActiveRes.error ||
        postsRes.error ||
        messagesRes.error ||
        reportsNewRes.error ||
        reportsResolvedRes.error;
      if (anyErr) throw anyErr;

      setMetrics({
        profilesTotal: profilesTotalRes.count ?? 0,
        profilesActive2m: profilesActiveRes.count ?? 0,
        postsInRange: postsRes.count ?? 0,
        messagesInRange: messagesRes.count ?? 0,
        reportsNew: reportsNewRes.count ?? 0,
        reportsResolved: reportsResolvedRes.count ?? 0,
      });
    } catch (e: any) {
      setError(e?.message ?? "Не удалось загрузить аналитику.");
      setMetrics(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AdminShell>
      <div className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Аналитика</h1>
            <p className="text-sm text-slate-600">
              MVP метрики активности и модерации.
            </p>
          </div>
          <button
            type="button"
            onClick={() => load()}
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 hover:bg-slate-50 disabled:opacity-60"
            disabled={loading}
          >
            Обновить
          </button>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Период: от
              </label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                До
              </label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => load()}
                disabled={loading}
                className="inline-flex h-10 w-full items-center justify-center rounded-xl bg-slate-900 px-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
              >
                Применить
              </button>
            </div>
          </div>
          {error ? (
            <p className="mt-3 text-sm font-medium text-rose-700">{error}</p>
          ) : null}
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">Загрузка…</p>
        ) : metrics ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <MetricCard title="Профили всего" value={String(metrics.profilesTotal)} />
            <MetricCard
              title="Онлайн (≤2 мин)"
              value={String(metrics.profilesActive2m)}
              hint="По profiles.last_seen_at"
            />
            <MetricCard
              title="Посты в общем чате"
              value={String(metrics.postsInRange)}
              hint={`${from} → ${to}`}
            />
            <MetricCard
              title="Сообщения в личных чатах"
              value={String(metrics.messagesInRange)}
              hint={`${from} → ${to}`}
            />
            <MetricCard title="Репорты: новые" value={String(metrics.reportsNew)} />
            <MetricCard
              title="Репорты: решённые"
              value={String(metrics.reportsResolved)}
            />
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
            Нет данных.
          </div>
        )}
      </div>
    </AdminShell>
  );
}

