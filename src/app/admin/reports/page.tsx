"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { AdminShell } from "@/app/admin/AdminShell";

type ReportStatus = "new" | "in_review" | "resolved" | "rejected";
type TargetType = "profile" | "post" | "message";

type AbuseReportRow = {
  id: string;
  created_at: string;
  reporter_profile_id: string | null;
  target_type: TargetType;
  target_id: string;
  category: string;
  comment: string | null;
  status: ReportStatus;
  resolution: string | null;
  assigned_to: string | null;
  resolved_at: string | null;
};

export default function AdminReportsPage() {
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<AbuseReportRow[]>([]);
  const [status, setStatus] = useState<"" | ReportStatus>("");
  const [q, setQ] = useState("");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await supabase
        .from("abuse_reports")
        .select(
          "id, created_at, reporter_profile_id, target_type, target_id, category, comment, status, resolution, assigned_to, resolved_at",
        )
        .order("created_at", { ascending: false })
        .limit(300);
      if (res.error) throw res.error;
      setRows((res.data ?? []) as AbuseReportRow[]);
    } catch (e: any) {
      setError(e?.message ?? "Не удалось загрузить репорты.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const query = q.trim().toLocaleLowerCase("ru-RU");
    return rows.filter((r) => {
      if (status && r.status !== status) return false;
      if (query) {
        const hay = [
          r.id,
          r.category,
          r.target_type,
          r.target_id,
          r.reporter_profile_id ?? "",
          r.comment ?? "",
          r.resolution ?? "",
        ]
          .join(" ")
          .toLocaleLowerCase("ru-RU");
        if (!hay.includes(query)) return false;
      }
      return true;
    });
  }, [rows, status, q]);

  const updateReport = async (
    id: string,
    patch: Partial<Pick<AbuseReportRow, "status" | "resolution" | "resolved_at">>,
    eventAction: string,
    payload: Record<string, any>,
  ) => {
    if (busyId) return;
    setBusyId(id);
    setError(null);
    try {
      const { error: updErr } = await supabase
        .from("abuse_reports")
        .update(patch)
        .eq("id", id);
      if (updErr) throw updErr;

      setRows((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } as any : x)));
      await supabase.from("abuse_report_events").insert({
        report_id: id,
        action: eventAction,
        payload,
      });
      await supabase.from("admin_audit_log").insert({
        action: `reports.${eventAction}`,
        target_type: "abuse_report",
        target_id: id,
        payload,
      });
    } catch (e: any) {
      setError(e?.message ?? "Не удалось обновить репорт.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AdminShell>
      <div className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Репорты</h1>
            <p className="text-sm text-slate-600">
              Очередь жалоб по профилям/постам/сообщениям.
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
          <div className="grid gap-3 md:grid-cols-4">
            <div className="md:col-span-3">
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Поиск
              </label>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value.slice(0, 80))}
                placeholder="id/категория/комментарий/target…"
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Статус
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="">Любой</option>
                <option value="new">Новый</option>
                <option value="in_review">В работе</option>
                <option value="resolved">Решён</option>
                <option value="rejected">Отклонён</option>
              </select>
            </div>
          </div>
          {error ? (
            <p className="mt-3 text-sm font-medium text-rose-700">{error}</p>
          ) : null}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900">
            Репорты: {filtered.length}
          </div>

          {loading ? (
            <p className="px-4 py-4 text-sm text-slate-500">Загрузка…</p>
          ) : filtered.length === 0 ? (
            <p className="px-4 py-4 text-sm text-slate-500">Нет репортов.</p>
          ) : (
            <div className="max-h-[75vh] overflow-y-auto divide-y divide-slate-100">
              {filtered.map((r) => {
                const busy = busyId === r.id;
                return (
                  <div key={r.id} className="p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-700">
                          {new Date(r.created_at).toLocaleString("ru-RU")} ·{" "}
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                            {r.status}
                          </span>
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">
                          {r.category}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Target: {r.target_type} / {r.target_id}
                          {r.reporter_profile_id ? (
                            <> · Reporter: {r.reporter_profile_id}</>
                          ) : null}
                        </p>
                        {r.comment ? (
                          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-800">
                            {r.comment}
                          </p>
                        ) : (
                          <p className="mt-2 text-sm text-slate-500">(без комментария)</p>
                        )}
                        {r.resolution ? (
                          <p className="mt-2 text-xs text-emerald-700">
                            Решение: <span className="font-semibold">{r.resolution}</span>
                          </p>
                        ) : null}
                      </div>

                      <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            updateReport(
                              r.id,
                              { status: "in_review" },
                              "set_in_review",
                              {},
                            )
                          }
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-50 disabled:opacity-60"
                        >
                          В работу
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            updateReport(
                              r.id,
                              {
                                status: "resolved",
                                resolution: "Приняты меры",
                                resolved_at: new Date().toISOString(),
                              },
                              "resolve",
                              { resolution: "Приняты меры" },
                            )
                          }
                          className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-60"
                        >
                          Решить
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            updateReport(
                              r.id,
                              {
                                status: "rejected",
                                resolution: "Отклонено",
                                resolved_at: new Date().toISOString(),
                              },
                              "reject",
                              { resolution: "Отклонено" },
                            )
                          }
                          className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800 hover:bg-rose-100 disabled:opacity-60"
                        >
                          Отклонить
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  );
}

