"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { AdminShell } from "@/app/admin/AdminShell";

type AdminRole = "super_admin" | "moderator" | "support";

type AdminUserRow = {
  auth_user_id: string;
  role: AdminRole;
  created_at: string;
  created_by: string | null;
};

export default function AdminAdminsPage() {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [newAuthUserId, setNewAuthUserId] = useState("");
  const [newRole, setNewRole] = useState<AdminRole>("support");

  const load = async () => {
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      const res = await supabase
        .from("admin_users")
        .select("auth_user_id, role, created_at, created_by")
        .order("created_at", { ascending: false })
        .limit(200);
      if (res.error) throw res.error;
      setRows((res.data ?? []) as AdminUserRow[]);
    } catch (e: any) {
      setError(e?.message ?? "Не удалось загрузить админов.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const addAdmin = async () => {
    const v = newAuthUserId.trim();
    if (!v) return;
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error: insErr } = await supabase.from("admin_users").insert({
        auth_user_id: v,
        role: newRole,
        created_by: user?.id ?? null,
      });
      if (insErr) throw insErr;
      setNewAuthUserId("");
      await load();
      setInfo("Админ добавлен.");
      await supabase.from("admin_audit_log").insert({
        action: "admin_users.insert",
        target_type: "admin_users",
        target_id: v,
        payload: { role: newRole },
      });
    } catch (e: any) {
      setError(e?.message ?? "Не удалось добавить админа.");
    } finally {
      setBusy(false);
    }
  };

  const updateRole = async (id: string, role: AdminRole) => {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const { error: updErr } = await supabase
        .from("admin_users")
        .update({ role })
        .eq("auth_user_id", id);
      if (updErr) throw updErr;
      setRows((prev) => prev.map((x) => (x.auth_user_id === id ? { ...x, role } : x)));
      await supabase.from("admin_audit_log").insert({
        action: "admin_users.update_role",
        target_type: "admin_users",
        target_id: id,
        payload: { role },
      });
      setInfo("Роль обновлена.");
    } catch (e: any) {
      setError(e?.message ?? "Не удалось обновить роль.");
    } finally {
      setBusy(false);
    }
  };

  const removeAdmin = async (id: string) => {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const { error: delErr } = await supabase
        .from("admin_users")
        .delete()
        .eq("auth_user_id", id);
      if (delErr) throw delErr;
      setRows((prev) => prev.filter((x) => x.auth_user_id !== id));
      await supabase.from("admin_audit_log").insert({
        action: "admin_users.delete",
        target_type: "admin_users",
        target_id: id,
        payload: {},
      });
      setInfo("Доступ удалён.");
    } catch (e: any) {
      setError(e?.message ?? "Не удалось удалить доступ.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminShell>
      <div className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Админы</h1>
            <p className="text-sm text-slate-600">
              Управление ролями админов (доступ: super_admin по RLS).
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
          <h2 className="text-sm font-semibold text-slate-900">Добавить админа</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-[1fr_200px_auto]">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                auth_user_id
              </label>
              <input
                value={newAuthUserId}
                onChange={(e) => setNewAuthUserId(e.target.value)}
                placeholder="UUID из auth.users"
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Роль
              </label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as AdminRole)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="support">support</option>
                <option value="moderator">moderator</option>
                <option value="super_admin">super_admin</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={addAdmin}
                disabled={busy}
                className="inline-flex h-10 items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
              >
                Добавить
              </button>
            </div>
          </div>
          {error ? (
            <p className="mt-3 text-sm font-medium text-rose-700">{error}</p>
          ) : null}
          {info ? (
            <p className="mt-3 text-sm font-medium text-emerald-700">{info}</p>
          ) : null}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900">
            Список
          </div>
          {loading ? (
            <p className="px-4 py-4 text-sm text-slate-500">Загрузка…</p>
          ) : rows.length === 0 ? (
            <p className="px-4 py-4 text-sm text-slate-500">Пусто</p>
          ) : (
            <div className="max-h-[70vh] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white text-left text-xs text-slate-500">
                  <tr className="border-b border-slate-200">
                    <th className="px-4 py-2">auth_user_id</th>
                    <th className="px-4 py-2">role</th>
                    <th className="px-4 py-2">created_at</th>
                    <th className="px-4 py-2">действия</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.auth_user_id} className="border-b border-slate-100">
                      <td className="px-4 py-2 font-mono text-xs text-slate-700">
                        {r.auth_user_id}
                      </td>
                      <td className="px-4 py-2">
                        <select
                          value={r.role}
                          onChange={(e) =>
                            updateRole(r.auth_user_id, e.target.value as AdminRole)
                          }
                          disabled={busy}
                          className="h-9 rounded-xl border border-slate-200 bg-white px-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-60"
                        >
                          <option value="support">support</option>
                          <option value="moderator">moderator</option>
                          <option value="super_admin">super_admin</option>
                        </select>
                      </td>
                      <td className="px-4 py-2 text-xs text-slate-600">
                        {new Date(r.created_at).toLocaleString("ru-RU")}
                      </td>
                      <td className="px-4 py-2">
                        <button
                          type="button"
                          onClick={() => removeAdmin(r.auth_user_id)}
                          disabled={busy}
                          className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800 hover:bg-rose-100 disabled:opacity-60"
                        >
                          Удалить
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  );
}

