"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type AdminUserRow = {
  id: string;
  full_name: string | null;
  city: string | null;
  role_title: string | null;
  is_blocked: boolean | null;
};

type AdminPostRow = {
  id: string;
  body: string | null;
  created_at: string;
  author_id: string;
  author: { full_name: string | null } | { full_name: string | null }[] | null;
};

type IndustryRow = { label: string; is_stock: boolean };
type SubindustryRow = { industry_label: string; label: string; is_stock: boolean };
type ProfessionRow = { label: string; is_stock: boolean };

function sortRuAsc(a: string, b: string) {
  return a.localeCompare(b, "ru");
}

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [posts, setPosts] = useState<AdminPostRow[]>([]);
  const [industries, setIndustries] = useState<IndustryRow[]>([]);
  const [subindustries, setSubindustries] = useState<SubindustryRow[]>([]);
  const [professions, setProfessions] = useState<ProfessionRow[]>([]);

  const [newIndustry, setNewIndustry] = useState("");
  const [newSubindustryIndustry, setNewSubindustryIndustry] = useState("");
  const [newSubindustry, setNewSubindustry] = useState("");
  const [newProfession, setNewProfession] = useState("");

  type ConfirmPayload =
    | { kind: "industry"; label: string }
    | { kind: "subindustry"; industryLabel: string; label: string }
    | { kind: "profession"; label: string };

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmPayload, setConfirmPayload] = useState<ConfirmPayload | null>(
    null,
  );

  const loadAll = async () => {
    setError(null);
    const [
      usersRes,
      postsRes,
      industriesRes,
      subindustriesRes,
      professionsRes,
    ] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, city, role_title, is_blocked")
        .order("full_name", { ascending: true })
        .limit(500),
      supabase
        .from("posts")
        .select("id, body, created_at, author_id, author:profiles(full_name)")
        .order("created_at", { ascending: false })
        .limit(200),
      supabase.from("industry_catalog").select("label,is_stock"),
      supabase.from("subindustry_catalog").select("industry_label,label,is_stock"),
      supabase.from("profession_catalog").select("label,is_stock"),
    ]);

    if (usersRes.error) throw usersRes.error;
    if (postsRes.error) throw postsRes.error;
    if (industriesRes.error) throw industriesRes.error;
    if (subindustriesRes.error) throw subindustriesRes.error;
    if (professionsRes.error) throw professionsRes.error;

    setUsers((usersRes.data ?? []) as AdminUserRow[]);
    setPosts((postsRes.data ?? []) as AdminPostRow[]);
    setIndustries(
      ((industriesRes.data ?? []) as IndustryRow[])
        .slice()
        .sort((a, b) => sortRuAsc(a.label, b.label)),
    );
    setSubindustries(
      ((subindustriesRes.data ?? []) as SubindustryRow[])
        .slice()
        .sort((a, b) =>
          a.industry_label === b.industry_label
            ? sortRuAsc(a.label, b.label)
            : sortRuAsc(a.industry_label, b.industry_label),
        ),
    );
    setProfessions(
      ((professionsRes.data ?? []) as ProfessionRow[])
        .slice()
        .sort((a, b) => sortRuAsc(a.label, b.label)),
    );
  };

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        setError(null);

        const {
          data: { user },
          error: userErr,
        } = await supabase.auth.getUser();
        if (userErr) throw userErr;
        if (!user) {
          setError("Нужно войти в аккаунт.");
          return;
        }

        // Админ определяется по записи в public.admin_users
        const { data: adminRow, error: adminErr } = await supabase
          .from("admin_users")
          .select("auth_user_id")
          .eq("auth_user_id", user.id)
          .maybeSingle();
        if (adminErr) throw adminErr;
        if (!adminRow) {
          setError("Доступ запрещён: у вас нет прав администратора.");
          return;
        }

        setIsAdmin(true);
        await loadAll();
      } catch (e: any) {
        setError(e?.message ?? "Не удалось открыть админку.");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const toggleBlock = async (u: AdminUserRow) => {
    try {
      setError(null);
      const { error: updErr } = await supabase
        .from("profiles")
        .update({ is_blocked: !u.is_blocked })
        .eq("id", u.id);
      if (updErr) throw updErr;
      setUsers((prev) =>
        prev.map((x) =>
          x.id === u.id ? { ...x, is_blocked: !x.is_blocked } : x,
        ),
      );
    } catch (e: any) {
      setError(e?.message ?? "Не удалось изменить блокировку пользователя.");
    }
  };

  const deletePost = async (postId: string) => {
    try {
      setError(null);
      const { error: delErr } = await supabase.from("posts").delete().eq("id", postId);
      if (delErr) throw delErr;
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch (e: any) {
      setError(e?.message ?? "Не удалось удалить сообщение.");
    }
  };

  const addIndustry = async () => {
    const v = newIndustry.trim();
    if (!v) return;
    try {
      setError(null);
      const { error: insErr } = await supabase
        .from("industry_catalog")
        .insert({ label: v });
      if (insErr) throw insErr;
      setNewIndustry("");
      await loadAll();
      setInfo("Отрасль добавлена.");
    } catch (e: any) {
      setError(e?.message ?? "Не удалось добавить отрасль.");
    }
  };

  const deleteIndustryDirect = async (label: string) => {
    try {
      setError(null);
      await supabase.from("subindustry_catalog").delete().eq("industry_label", label);
      const { error: delErr } = await supabase
        .from("industry_catalog")
        .delete()
        .eq("label", label);
      if (delErr) throw delErr;
      await loadAll();
      setInfo("Отрасль удалена.");
    } catch (e: any) {
      setError(e?.message ?? "Не удалось удалить отрасль.");
    }
  };

  const requestDeleteIndustry = async (row: IndustryRow) => {
    if (row.is_stock) {
      await deleteIndustryDirect(row.label);
      return;
    }
    setConfirmPayload({ kind: "industry", label: row.label });
    setConfirmOpen(true);
  };

  const addSubindustry = async () => {
    const ind = newSubindustryIndustry.trim();
    const sub = newSubindustry.trim();
    if (!ind || !sub) return;
    try {
      setError(null);
      const { error: insErr } = await supabase
        .from("subindustry_catalog")
        .insert({ industry_label: ind, label: sub });
      if (insErr) throw insErr;
      setNewSubindustry("");
      await loadAll();
      setInfo("Подотрасль добавлена.");
    } catch (e: any) {
      setError(e?.message ?? "Не удалось добавить подотрасль.");
    }
  };

  const deleteSubindustryDirect = async (industryLabel: string, label: string) => {
    try {
      setError(null);
      const { error: delErr } = await supabase
        .from("subindustry_catalog")
        .delete()
        .eq("industry_label", industryLabel)
        .eq("label", label);
      if (delErr) throw delErr;
      setSubindustries((prev) =>
        prev.filter(
          (x) => !(x.industry_label === industryLabel && x.label === label),
        ),
      );
    } catch (e: any) {
      setError(e?.message ?? "Не удалось удалить подотрасль.");
    }
  };

  const requestDeleteSubindustry = async (row: SubindustryRow) => {
    if (row.is_stock) {
      await deleteSubindustryDirect(row.industry_label, row.label);
      return;
    }
    setConfirmPayload({
      kind: "subindustry",
      industryLabel: row.industry_label,
      label: row.label,
    });
    setConfirmOpen(true);
  };

  const addProfession = async () => {
    const v = newProfession.trim();
    if (!v) return;
    try {
      setError(null);
      const { error: insErr } = await supabase
        .from("profession_catalog")
        .insert({ label: v });
      if (insErr) throw insErr;
      setNewProfession("");
      await loadAll();
      setInfo("Профессия добавлена.");
    } catch (e: any) {
      setError(e?.message ?? "Не удалось добавить профессию.");
    }
  };

  const deleteProfessionDirect = async (label: string) => {
    try {
      setError(null);
      const { error: delErr } = await supabase
        .from("profession_catalog")
        .delete()
        .eq("label", label);
      if (delErr) throw delErr;
      setProfessions((prev) => prev.filter((p) => p.label !== label));
    } catch (e: any) {
      setError(e?.message ?? "Не удалось удалить профессию.");
    }
  };

  const requestDeleteProfession = async (row: ProfessionRow) => {
    if (row.is_stock) {
      await deleteProfessionDirect(row.label);
      return;
    }
    setConfirmPayload({ kind: "profession", label: row.label });
    setConfirmOpen(true);
  };

  const onConfirmDelete = async () => {
    if (!confirmPayload) return;
    const payload = confirmPayload;
    setConfirmOpen(false);
    setConfirmPayload(null);

    if (payload.kind === "industry") {
      await deleteIndustryDirect(payload.label);
    } else if (payload.kind === "subindustry") {
      await deleteSubindustryDirect(payload.industryLabel, payload.label);
    } else if (payload.kind === "profession") {
      await deleteProfessionDirect(payload.label);
    }
  };

  const onCancelDelete = () => {
    setConfirmOpen(false);
    setConfirmPayload(null);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">Загрузка админки...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <p className="text-sm text-red-600">{error ?? "Доступ запрещён."}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-3 py-6">
      <div className="mx-auto w-full max-w-6xl space-y-4">
        <h1 className="text-xl font-semibold text-slate-900">Админка</h1>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {info ? <p className="text-sm text-emerald-600">{info}</p> : null}

        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">
            Пользователи: блокировка / разблокировка
          </h2>
          <div className="max-h-80 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-slate-500">
                <tr>
                  <th className="py-2">Имя</th>
                  <th className="py-2">Город</th>
                  <th className="py-2">Профессия</th>
                  <th className="py-2">Статус</th>
                  <th className="py-2">Действие</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-t border-slate-100">
                    <td className="py-2">{u.full_name || "Без имени"}</td>
                    <td className="py-2">{u.city || "-"}</td>
                    <td className="py-2">{u.role_title || "-"}</td>
                    <td className="py-2">
                      {u.is_blocked ? (
                        <span className="text-red-600">Заблокирован</span>
                      ) : (
                        <span className="text-emerald-600">Активен</span>
                      )}
                    </td>
                    <td className="py-2">
                      <button
                        type="button"
                        onClick={() => toggleBlock(u)}
                        className="rounded-lg border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50"
                      >
                        {u.is_blocked ? "Разблокировать" : "Заблокировать"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">
            Сообщения общего чата: удаление
          </h2>
          <div className="max-h-80 space-y-2 overflow-y-auto">
            {posts.map((p) => {
              const authorObj = Array.isArray(p.author) ? p.author[0] : p.author;
              const authorName = authorObj?.full_name || "Пользователь";
              return (
                <div
                  key={p.id}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                >
                  <div className="mb-1 flex items-center justify-between">
                    <p className="text-xs font-medium text-slate-700">
                      {authorName} · {new Date(p.created_at).toLocaleString("ru-RU")}
                    </p>
                    <button
                      type="button"
                      onClick={() => deletePost(p.id)}
                      className="rounded-lg border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                    >
                      Удалить
                    </button>
                  </div>
                  <p className="text-sm text-slate-800 whitespace-pre-wrap">
                    {p.body || "(пусто)"}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">
            Справочники: отрасли / подотрасли / профессии
          </h2>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2 rounded-xl border border-slate-200 p-3">
              <p className="text-xs font-semibold text-slate-700">Отрасли</p>
              <div className="flex gap-2">
                <input
                  value={newIndustry}
                  onChange={(e) => setNewIndustry(e.target.value)}
                  placeholder="Новая отрасль"
                  className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs"
                />
                <button
                  type="button"
                  onClick={addIndustry}
                  className="rounded-lg bg-sky-600 px-2 py-1 text-xs font-medium text-white"
                >
                  +
                </button>
              </div>
              <div className="max-h-56 space-y-1 overflow-y-auto">
                {industries.map((i) => (
                  <div key={i.label} className="flex items-center justify-between text-xs">
                    <span>{i.label}</span>
                    <button
                      type="button"
                      onClick={() => requestDeleteIndustry(i)}
                      className="text-red-600 hover:underline"
                    >
                      Удалить
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2 rounded-xl border border-slate-200 p-3">
              <p className="text-xs font-semibold text-slate-700">Подотрасли</p>
              <div className="space-y-2">
                <select
                  value={newSubindustryIndustry}
                  onChange={(e) => setNewSubindustryIndustry(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs"
                >
                  <option value="">Выберите отрасль</option>
                  {industries.map((i) => (
                    <option key={i.label} value={i.label}>
                      {i.label}
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <input
                    value={newSubindustry}
                    onChange={(e) => setNewSubindustry(e.target.value)}
                    placeholder="Новая подотрасль"
                    className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs"
                  />
                  <button
                    type="button"
                    onClick={addSubindustry}
                    className="rounded-lg bg-sky-600 px-2 py-1 text-xs font-medium text-white"
                  >
                    +
                  </button>
                </div>
              </div>
              <div className="max-h-56 space-y-1 overflow-y-auto">
                {subindustries.map((s) => (
                  <div
                    key={`${s.industry_label}::${s.label}`}
                    className="flex items-center justify-between text-xs"
                  >
                    <span>
                      {s.industry_label} — {s.label}
                    </span>
                    <button
                      type="button"
                      onClick={() => requestDeleteSubindustry(s)}
                      className="text-red-600 hover:underline"
                    >
                      Удалить
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2 rounded-xl border border-slate-200 p-3">
              <p className="text-xs font-semibold text-slate-700">Профессии</p>
              <div className="flex gap-2">
                <input
                  value={newProfession}
                  onChange={(e) => setNewProfession(e.target.value)}
                  placeholder="Новая профессия"
                  className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs"
                />
                <button
                  type="button"
                  onClick={addProfession}
                  className="rounded-lg bg-sky-600 px-2 py-1 text-xs font-medium text-white"
                >
                  +
                </button>
              </div>
              <div className="max-h-56 space-y-1 overflow-y-auto">
                {professions.map((p) => (
                  <div key={p.label} className="flex items-center justify-between text-xs">
                    <span>{p.label}</span>
                    <button
                      type="button"
                      onClick={() => requestDeleteProfession(p)}
                      className="text-red-600 hover:underline"
                    >
                      Удалить
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            Удаление отрасли удаляет её подотрасли из каталога. Если значение уже
            используется в профилях, существующие профили не изменяются автоматически.
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="mb-2 text-sm font-semibold text-slate-900">Справка</h2>
          <p className="text-xs text-slate-600">
            Доступ к админке и операциям управляется через SQL-политику в
            `docs/admin_panel.sql`.
          </p>
        </section>
      </div>

      {confirmOpen && (
        <div className="fixed inset-0 z-[2500] flex items-center justify-center bg-black/50 px-3">
          <div className="w-full max-w-sm rounded-2xl bg-white p-4 text-sm shadow-xl">
            <p className="text-slate-900">{`Вы действительно хотите удалить данные?`}</p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={onCancelDelete}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-900 hover:bg-slate-50"
              >
                Нет
              </button>
              <button
                type="button"
                onClick={onConfirmDelete}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-white hover:bg-red-700"
              >
                Да
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

