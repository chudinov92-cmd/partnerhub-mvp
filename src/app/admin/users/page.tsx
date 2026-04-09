"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { AdminShell } from "@/app/admin/AdminShell";

type AdminUserRow = {
  id: string;
  full_name: string | null;
  city: string | null;
  role_title: string | null;
  rating_count: number | null;
  last_seen_at: string | null;
  is_blocked: boolean | null;
};

function isOnline(lastSeenAt: string | null) {
  if (!lastSeenAt) return false;
  const t = new Date(lastSeenAt).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t <= 2 * 60 * 1000;
}

export default function AdminUsersPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [q, setQ] = useState("");
  const [city, setCity] = useState("");
  const [blocked, setBlocked] = useState<"" | "blocked" | "active">("");
  const [online, setOnline] = useState<"" | "online" | "offline">("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await supabase
        .from("profiles")
        .select("id, full_name, city, role_title, rating_count, last_seen_at, is_blocked")
        .order("full_name", { ascending: true })
        .limit(500);
      if (res.error) throw res.error;
      setRows((res.data ?? []) as AdminUserRow[]);
    } catch (e: any) {
      setError(e?.message ?? "Не удалось загрузить пользователей.");
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
      if (query) {
        const name = String(r.full_name ?? "").toLocaleLowerCase("ru-RU");
        const id = String(r.id ?? "").toLocaleLowerCase("ru-RU");
        if (!name.includes(query) && !id.includes(query)) return false;
      }
      if (city.trim()) {
        const c = String(r.city ?? "").toLocaleLowerCase("ru-RU");
        if (!c.includes(city.trim().toLocaleLowerCase("ru-RU"))) return false;
      }
      if (blocked) {
        const isBlocked = !!r.is_blocked;
        if (blocked === "blocked" && !isBlocked) return false;
        if (blocked === "active" && isBlocked) return false;
      }
      if (online) {
        const o = isOnline(r.last_seen_at ?? null);
        if (online === "online" && !o) return false;
        if (online === "offline" && o) return false;
      }
      return true;
    });
  }, [rows, q, city, blocked, online]);

  const toggleBlock = async (u: AdminUserRow) => {
    if (busyId) return;
    setBusyId(u.id);
    setError(null);
    try {
      const { error: updErr } = await supabase
        .from("profiles")
        .update({ is_blocked: !u.is_blocked })
        .eq("id", u.id);
      if (updErr) throw updErr;
      setRows((prev) =>
        prev.map((x) => (x.id === u.id ? { ...x, is_blocked: !x.is_blocked } : x)),
      );
      // best-effort audit
      await supabase.from("admin_audit_log").insert({
        action: "profiles.toggle_block",
        target_type: "profile",
        target_id: u.id,
        payload: { next_is_blocked: !u.is_blocked },
      });
    } catch (e: any) {
      setError(e?.message ?? "Не удалось изменить блокировку пользователя.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AdminShell>
      <div className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Пользователи</h1>
            <p className="text-sm text-slate-600">
              Поиск, просмотр и блокировка профилей.
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
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Поиск
              </label>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value.slice(0, 60))}
                placeholder="Имя или id профиля…"
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Город
              </label>
              <input
                value={city}
                onChange={(e) => setCity(e.target.value.slice(0, 40))}
                placeholder="Например, Пермь"
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Статус
              </label>
              <select
                value={blocked}
                onChange={(e) =>
                  setBlocked(e.target.value as "" | "blocked" | "active")
                }
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="">Любой</option>
                <option value="active">Активен</option>
                <option value="blocked">Заблокирован</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Онлайн
              </label>
              <select
                value={online}
                onChange={(e) =>
                  setOnline(e.target.value as "" | "online" | "offline")
                }
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="">Любой</option>
                <option value="online">Онлайн</option>
                <option value="offline">Оффлайн</option>
              </select>
            </div>
          </div>

          {error ? (
            <p className="mt-3 text-sm font-medium text-rose-700">{error}</p>
          ) : null}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900">
            Результаты: {filtered.length}
          </div>

          {loading ? (
            <p className="px-4 py-4 text-sm text-slate-500">Загрузка…</p>
          ) : filtered.length === 0 ? (
            <p className="px-4 py-4 text-sm text-slate-500">Ничего не найдено.</p>
          ) : (
            <div className="max-h-[70vh] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white text-left text-xs text-slate-500">
                  <tr className="border-b border-slate-200">
                    <th className="px-4 py-2">Имя</th>
                    <th className="px-4 py-2">Город</th>
                    <th className="px-4 py-2">Профессия</th>
                    <th className="px-4 py-2">Рейтинг</th>
                    <th className="px-4 py-2">Онлайн</th>
                    <th className="px-4 py-2">Статус</th>
                    <th className="px-4 py-2">Действие</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u) => {
                    const onlineNow = isOnline(u.last_seen_at ?? null);
                    return (
                      <tr key={u.id} className="border-b border-slate-100">
                        <td className="px-4 py-2">
                          <div className="flex flex-col">
                            <span className="font-medium text-slate-900">
                              {u.full_name || "Без имени"}
                            </span>
                            <span className="text-xs text-slate-500">
                              {u.id}
                            </span>
                            <Link
                              href={`/profiles/${u.id}`}
                              className="mt-1 text-xs font-semibold text-emerald-600 hover:underline"
                            >
                              Открыть публичный профиль
                            </Link>
                          </div>
                        </td>
                        <td className="px-4 py-2">{u.city || "-"}</td>
                        <td className="px-4 py-2">{u.role_title || "-"}</td>
                        <td className="px-4 py-2 tabular-nums">
                          {u.rating_count ?? 0}
                        </td>
                        <td className="px-4 py-2">
                          <span
                            className={`inline-flex items-center gap-2 text-xs font-semibold ${
                              onlineNow ? "text-emerald-700" : "text-slate-500"
                            }`}
                            title={onlineNow ? "Онлайн" : "Оффлайн"}
                          >
                            <span
                              className={`h-2 w-2 rounded-full ${
                                onlineNow ? "bg-emerald-500" : "bg-slate-400"
                              }`}
                              aria-hidden
                            />
                            {onlineNow ? "Онлайн" : "Оффлайн"}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          {u.is_blocked ? (
                            <span className="text-rose-700">Заблокирован</span>
                          ) : (
                            <span className="text-emerald-700">Активен</span>
                          )}
                        </td>
                        <td className="px-4 py-2">
                          <button
                            type="button"
                            onClick={() => toggleBlock(u)}
                            disabled={busyId === u.id}
                            className="inline-flex min-h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-900 hover:bg-slate-50 disabled:opacity-60"
                          >
                            {u.is_blocked ? "Разблокировать" : "Заблокировать"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  );
}

