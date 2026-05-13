"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { AdminShell } from "@/app/admin/AdminShell";

type ModerationStatus = "active" | "hidden" | "deleted";

type AdminPostRow = {
  id: string;
  body: string | null;
  created_at: string;
  city: string | null;
  author_id: string;
  moderation_status: ModerationStatus;
  moderation_reason: string | null;
  moderated_at: string | null;
  author: { full_name: string | null } | { full_name: string | null }[] | null;
};

function normAuthor(a: any) {
  return Array.isArray(a) ? a[0] : a;
}

export default function AdminPostsPage() {
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<AdminPostRow[]>([]);
  const [q, setQ] = useState("");
  const [city, setCity] = useState("");
  const [status, setStatus] = useState<"" | ModerationStatus>("");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await supabase
        .from("posts")
        .select(
          "id, body, created_at, city, author_id, moderation_status, moderation_reason, moderated_at, author:profiles(full_name)",
        )
        .order("created_at", { ascending: false })
        .limit(300);
      if (res.error) throw res.error;
      setRows((res.data ?? []) as AdminPostRow[]);
    } catch (e: any) {
      setError(e?.message ?? "Не удалось загрузить посты.");
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
    const cityQ = city.trim().toLocaleLowerCase("ru-RU");
    return rows.filter((p) => {
      if (status && p.moderation_status !== status) return false;
      if (cityQ) {
        const c = String(p.city ?? "").toLocaleLowerCase("ru-RU");
        if (!c.includes(cityQ)) return false;
      }
      if (query) {
        const b = String(p.body ?? "").toLocaleLowerCase("ru-RU");
        const a = normAuthor(p.author);
        const an = String(a?.full_name ?? "").toLocaleLowerCase("ru-RU");
        if (!b.includes(query) && !an.includes(query)) return false;
      }
      return true;
    });
  }, [rows, q, city, status]);

  const setPostStatus = async (
    postId: string,
    nextStatus: ModerationStatus,
    reason: string | null,
  ) => {
    if (busyId) return;
    setBusyId(postId);
    setError(null);
    try {
      const res = await fetch("/api/admin/posts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          post_id: postId,
          moderation_status: nextStatus,
          moderation_reason: reason,
        }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(j.error ?? "Не удалось изменить статус поста.");

      const moderatedAt = new Date().toISOString();
      setRows((prev) =>
        prev.map((x) =>
          x.id === postId
            ? {
                ...x,
                moderation_status: nextStatus,
                moderation_reason: reason,
                moderated_at: moderatedAt,
              }
            : x,
        ),
      );
    } catch (e: any) {
      setError(e?.message ?? "Не удалось изменить статус поста.");
    } finally {
      setBusyId(null);
    }
  };

  const hardDelete = async (postId: string) => {
    if (busyId) return;
    setBusyId(postId);
    setError(null);
    try {
      const qs = `post_id=${encodeURIComponent(postId)}`;
      const res = await fetch(`/api/admin/posts?${qs}`, {
        method: "DELETE",
        credentials: "include",
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(j.error ?? "Не удалось удалить пост.");

      setRows((prev) => prev.filter((x) => x.id !== postId));
    } catch (e: any) {
      setError(e?.message ?? "Не удалось удалить пост.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AdminShell>
      <div className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Общий чат</h1>
            <p className="text-sm text-slate-600">
              Модерация постов: скрыть/восстановить, причины, аудит.
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
                onChange={(e) => setQ(e.target.value.slice(0, 80))}
                placeholder="Текст или автор…"
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
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="">Любой</option>
                <option value="active">Активный</option>
                <option value="hidden">Скрыт</option>
                <option value="deleted">Помечен удалённым</option>
              </select>
            </div>
          </div>
          {error ? (
            <p className="mt-3 text-sm font-medium text-rose-700">{error}</p>
          ) : null}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900">
            Посты: {filtered.length}
          </div>

          {loading ? (
            <p className="px-4 py-4 text-sm text-slate-500">Загрузка…</p>
          ) : filtered.length === 0 ? (
            <p className="px-4 py-4 text-sm text-slate-500">Нет постов.</p>
          ) : (
            <div className="max-h-[75vh] overflow-y-auto divide-y divide-slate-100">
              {filtered.map((p) => {
                const author = normAuthor(p.author);
                const authorName = author?.full_name || "Пользователь";
                const busy = busyId === p.id;
                const statusLabel =
                  p.moderation_status === "active"
                    ? "Активный"
                    : p.moderation_status === "hidden"
                      ? "Скрыт"
                      : "Удалён";
                return (
                  <div key={p.id} className="p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-700">
                          {authorName} ·{" "}
                          <span className="text-slate-500">
                            {new Date(p.created_at).toLocaleString("ru-RU")}
                          </span>
                          {p.city ? (
                            <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                              {p.city}
                            </span>
                          ) : null}
                        </p>
                        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-900">
                          {p.body || "(пусто)"}
                        </p>
                        <div className="mt-2 text-xs text-slate-500">
                          Статус:{" "}
                          <span className="font-semibold text-slate-700">
                            {statusLabel}
                          </span>
                          {p.moderation_reason ? (
                            <>
                              {" "}
                              · Причина:{" "}
                              <span className="font-medium text-slate-700">
                                {p.moderation_reason}
                              </span>
                            </>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            setPostStatus(p.id, "active", null)
                          }
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-50 disabled:opacity-60"
                        >
                          Восстановить
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            setPostStatus(p.id, "hidden", "Нарушение правил")
                          }
                          className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-60"
                        >
                          Скрыть
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            setPostStatus(p.id, "deleted", "Удалено модератором")
                          }
                          className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800 hover:bg-rose-100 disabled:opacity-60"
                        >
                          Пометить удалённым
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => hardDelete(p.id)}
                          className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                          title="Требует super_admin по RLS"
                        >
                          Удалить навсегда
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

