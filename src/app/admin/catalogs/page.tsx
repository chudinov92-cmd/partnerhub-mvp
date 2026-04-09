"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { AdminShell } from "@/app/admin/AdminShell";

type IndustryRow = { label: string; is_stock: boolean };
type SubindustryRow = { industry_label: string; label: string; is_stock: boolean };
type ProfessionRow = { label: string; is_stock: boolean };

function sortRuAsc(a: string, b: string) {
  return a.localeCompare(b, "ru");
}

export default function AdminCatalogsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const [industries, setIndustries] = useState<IndustryRow[]>([]);
  const [subindustries, setSubindustries] = useState<SubindustryRow[]>([]);
  const [professions, setProfessions] = useState<ProfessionRow[]>([]);

  const [q, setQ] = useState("");

  const [newIndustry, setNewIndustry] = useState("");
  const [newSubindustryIndustry, setNewSubindustryIndustry] = useState("");
  const [newSubindustry, setNewSubindustry] = useState("");
  const [newProfession, setNewProfession] = useState("");

  type ConfirmPayload =
    | { kind: "industry"; label: string }
    | { kind: "subindustry"; industryLabel: string; label: string }
    | { kind: "profession"; label: string };
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmPayload, setConfirmPayload] = useState<ConfirmPayload | null>(null);

  const loadAll = async () => {
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      const [industriesRes, subindustriesRes, professionsRes] = await Promise.all([
        supabase.from("industry_catalog").select("label,is_stock"),
        supabase.from("subindustry_catalog").select("industry_label,label,is_stock"),
        supabase.from("profession_catalog").select("label,is_stock"),
      ]);
      if (industriesRes.error) throw industriesRes.error;
      if (subindustriesRes.error) throw subindustriesRes.error;
      if (professionsRes.error) throw professionsRes.error;

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
    } catch (e: any) {
      setError(e?.message ?? "Не удалось загрузить справочники.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
  }, []);

  const query = q.trim().toLocaleLowerCase("ru-RU");
  const filteredIndustries = useMemo(() => {
    if (!query) return industries;
    return industries.filter((x) =>
      x.label.toLocaleLowerCase("ru-RU").includes(query),
    );
  }, [industries, query]);

  const filteredSubindustries = useMemo(() => {
    if (!query) return subindustries;
    return subindustries.filter((x) => {
      const hay = `${x.industry_label} ${x.label}`.toLocaleLowerCase("ru-RU");
      return hay.includes(query);
    });
  }, [subindustries, query]);

  const filteredProfessions = useMemo(() => {
    if (!query) return professions;
    return professions.filter((x) =>
      x.label.toLocaleLowerCase("ru-RU").includes(query),
    );
  }, [professions, query]);

  const addIndustry = async () => {
    const v = newIndustry.trim();
    if (!v) return;
    setError(null);
    setInfo(null);
    try {
      const { error: insErr } = await supabase
        .from("industry_catalog")
        .insert({ label: v });
      if (insErr) throw insErr;
      setNewIndustry("");
      await loadAll();
      setInfo("Отрасль добавлена.");
      await supabase.from("admin_audit_log").insert({
        action: "catalogs.industry.insert",
        target_type: "industry_catalog",
        target_id: v,
      });
    } catch (e: any) {
      setError(e?.message ?? "Не удалось добавить отрасль.");
    }
  };

  const addSubindustry = async () => {
    const ind = newSubindustryIndustry.trim();
    const sub = newSubindustry.trim();
    if (!ind || !sub) return;
    setError(null);
    setInfo(null);
    try {
      const { error: insErr } = await supabase
        .from("subindustry_catalog")
        .insert({ industry_label: ind, label: sub });
      if (insErr) throw insErr;
      setNewSubindustry("");
      await loadAll();
      setInfo("Подотрасль добавлена.");
      await supabase.from("admin_audit_log").insert({
        action: "catalogs.subindustry.insert",
        target_type: "subindustry_catalog",
        target_id: `${ind}::${sub}`,
      });
    } catch (e: any) {
      setError(e?.message ?? "Не удалось добавить подотрасль.");
    }
  };

  const addProfession = async () => {
    const v = newProfession.trim();
    if (!v) return;
    setError(null);
    setInfo(null);
    try {
      const { error: insErr } = await supabase
        .from("profession_catalog")
        .insert({ label: v });
      if (insErr) throw insErr;
      setNewProfession("");
      await loadAll();
      setInfo("Профессия добавлена.");
      await supabase.from("admin_audit_log").insert({
        action: "catalogs.profession.insert",
        target_type: "profession_catalog",
        target_id: v,
      });
    } catch (e: any) {
      setError(e?.message ?? "Не удалось добавить профессию.");
    }
  };

  const deleteIndustryDirect = async (label: string) => {
    setError(null);
    setInfo(null);
    try {
      await supabase.from("subindustry_catalog").delete().eq("industry_label", label);
      const { error: delErr } = await supabase
        .from("industry_catalog")
        .delete()
        .eq("label", label);
      if (delErr) throw delErr;
      await loadAll();
      setInfo("Отрасль удалена.");
      await supabase.from("admin_audit_log").insert({
        action: "catalogs.industry.delete",
        target_type: "industry_catalog",
        target_id: label,
      });
    } catch (e: any) {
      setError(e?.message ?? "Не удалось удалить отрасль.");
    }
  };

  const deleteSubindustryDirect = async (industryLabel: string, label: string) => {
    setError(null);
    setInfo(null);
    try {
      const { error: delErr } = await supabase
        .from("subindustry_catalog")
        .delete()
        .eq("industry_label", industryLabel)
        .eq("label", label);
      if (delErr) throw delErr;
      await loadAll();
      setInfo("Подотрасль удалена.");
      await supabase.from("admin_audit_log").insert({
        action: "catalogs.subindustry.delete",
        target_type: "subindustry_catalog",
        target_id: `${industryLabel}::${label}`,
      });
    } catch (e: any) {
      setError(e?.message ?? "Не удалось удалить подотрасль.");
    }
  };

  const deleteProfessionDirect = async (label: string) => {
    setError(null);
    setInfo(null);
    try {
      const { error: delErr } = await supabase
        .from("profession_catalog")
        .delete()
        .eq("label", label);
      if (delErr) throw delErr;
      await loadAll();
      setInfo("Профессия удалена.");
      await supabase.from("admin_audit_log").insert({
        action: "catalogs.profession.delete",
        target_type: "profession_catalog",
        target_id: label,
      });
    } catch (e: any) {
      setError(e?.message ?? "Не удалось удалить профессию.");
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

  return (
    <AdminShell>
      <div className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Справочники</h1>
            <p className="text-sm text-slate-600">
              Отрасли, подотрасли, профессии (доступ: super_admin по RLS).
            </p>
          </div>
          <button
            type="button"
            onClick={() => loadAll()}
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 hover:bg-slate-50 disabled:opacity-60"
            disabled={loading}
          >
            Обновить
          </button>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <label className="mb-1 block text-xs font-semibold text-slate-700">
            Поиск по справочникам
          </label>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value.slice(0, 60))}
            placeholder="Например, Маркетолог / Торговля…"
            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
          />
          {error ? (
            <p className="mt-3 text-sm font-medium text-rose-700">{error}</p>
          ) : null}
          {info ? (
            <p className="mt-3 text-sm font-medium text-emerald-700">{info}</p>
          ) : null}
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Отрасли</h2>
            <div className="mt-3 flex gap-2">
              <input
                value={newIndustry}
                onChange={(e) => setNewIndustry(e.target.value)}
                placeholder="Новая отрасль"
                className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
              />
              <button
                type="button"
                onClick={addIndustry}
                className="inline-flex h-10 items-center justify-center rounded-xl bg-slate-900 px-3 text-sm font-semibold text-white hover:bg-slate-800"
              >
                +
              </button>
            </div>
            <div className="mt-3 max-h-80 overflow-y-auto">
              {filteredIndustries.length === 0 ? (
                <p className="py-2 text-sm text-slate-500">Пусто</p>
              ) : (
                <ul className="space-y-1">
                  {filteredIndustries.map((i) => (
                    <li key={i.label} className="flex items-center justify-between gap-2">
                      <span className="text-sm text-slate-900">{i.label}</span>
                      <button
                        type="button"
                        onClick={() => requestDeleteIndustry(i)}
                        className="rounded-lg px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                        title={i.is_stock ? "Удалится сразу" : "Попросит подтверждение"}
                      >
                        Удалить
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Подотрасли</h2>
            <div className="mt-3 space-y-2">
              <select
                value={newSubindustryIndustry}
                onChange={(e) => setNewSubindustryIndustry(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
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
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
                />
                <button
                  type="button"
                  onClick={addSubindustry}
                  className="inline-flex h-10 items-center justify-center rounded-xl bg-slate-900 px-3 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  +
                </button>
              </div>
            </div>
            <div className="mt-3 max-h-80 overflow-y-auto">
              {filteredSubindustries.length === 0 ? (
                <p className="py-2 text-sm text-slate-500">Пусто</p>
              ) : (
                <ul className="space-y-1">
                  {filteredSubindustries.map((s) => (
                    <li
                      key={`${s.industry_label}::${s.label}`}
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="text-sm text-slate-900">
                        <span className="text-slate-500">{s.industry_label} — </span>
                        {s.label}
                      </span>
                      <button
                        type="button"
                        onClick={() => requestDeleteSubindustry(s)}
                        className="rounded-lg px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                        title={s.is_stock ? "Удалится сразу" : "Попросит подтверждение"}
                      >
                        Удалить
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Профессии</h2>
            <div className="mt-3 flex gap-2">
              <input
                value={newProfession}
                onChange={(e) => setNewProfession(e.target.value)}
                placeholder="Новая профессия"
                className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
              />
              <button
                type="button"
                onClick={addProfession}
                className="inline-flex h-10 items-center justify-center rounded-xl bg-slate-900 px-3 text-sm font-semibold text-white hover:bg-slate-800"
              >
                +
              </button>
            </div>
            <div className="mt-3 max-h-80 overflow-y-auto">
              {filteredProfessions.length === 0 ? (
                <p className="py-2 text-sm text-slate-500">Пусто</p>
              ) : (
                <ul className="space-y-1">
                  {filteredProfessions.map((p) => (
                    <li key={p.label} className="flex items-center justify-between gap-2">
                      <span className="text-sm text-slate-900">{p.label}</span>
                      <button
                        type="button"
                        onClick={() => requestDeleteProfession(p)}
                        className="rounded-lg px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                        title={p.is_stock ? "Удалится сразу" : "Попросит подтверждение"}
                      >
                        Удалить
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Удаление отрасли удаляет её подотрасли из каталога. Если значение уже используется в
          профилях, существующие профили не изменяются автоматически.
        </div>
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
                className="rounded-lg bg-rose-600 px-3 py-1.5 text-white hover:bg-rose-700"
              >
                Да
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}

