"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/app/admin/AdminShell";
import {
  adminFetchPioneerPromoSettings,
  adminFetchPioneerSlots,
  adminGetAuthUser,
  adminInsertAuditLog,
  adminSetPioneerCityMax,
  adminSetPioneerPromoEnabled,
} from "@/services/adminService";

type SlotRow = {
  city: string;
  used_count: number;
  max_count: number;
};

function remainingOf(row: SlotRow) {
  return Math.max(0, Number(row.max_count) - Number(row.used_count));
}

export default function AdminPromoPage() {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [slots, setSlots] = useState<SlotRow[]>([]);
  const [draftMax, setDraftMax] = useState<Record<string, string>>({});
  const [savingCity, setSavingCity] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      const [settingsRes, slotsRes] = await Promise.all([
        adminFetchPioneerPromoSettings(),
        adminFetchPioneerSlots(),
      ]);
      if (settingsRes.error) throw settingsRes.error;
      if (slotsRes.error) throw slotsRes.error;

      const settings = settingsRes.data as {
        enabled?: boolean;
        updated_at?: string;
      } | null;
      setEnabled(settings?.enabled === true);
      setUpdatedAt(settings?.updated_at ?? null);

      const rows = ((slotsRes.data ?? []) as SlotRow[]).map((r) => ({
        city: r.city,
        used_count: Number(r.used_count ?? 0),
        max_count: Number(r.max_count ?? 0),
      }));
      setSlots(rows);
      setDraftMax(
        Object.fromEntries(rows.map((r) => [r.city, String(r.max_count)])),
      );
    } catch (e: unknown) {
      setError(
        e instanceof Error ? e.message : "Не удалось загрузить настройки акции.",
      );
      setSlots([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const permRow = useMemo(
    () => slots.find((r) => r.city === "Пермь") ?? null,
    [slots],
  );

  const togglePromo = async () => {
    const next = !enabled;
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const { error: updErr } = await adminSetPioneerPromoEnabled(next);
      if (updErr) throw updErr;
      setEnabled(next);
      setUpdatedAt(new Date().toISOString());
      const {
        data: { user },
      } = await adminGetAuthUser();
      await adminInsertAuditLog({
        actor_auth_user_id: user?.id ?? null,
        action: "pioneer_promo.toggle",
        target_type: "pioneer_promo_settings",
        target_id: "singleton",
        payload: { enabled: next },
      });
      setInfo(
        next
          ? "Акция включена: новые пионеры получают Pro+ на 90 дней."
          : "Акция выключена: квиз слоты не выдаёт.",
      );
    } catch (e: unknown) {
      setError(
        e instanceof Error ? e.message : "Не удалось переключить акцию.",
      );
    } finally {
      setBusy(false);
    }
  };

  const saveCityMax = async (city: string) => {
    const raw = (draftMax[city] ?? "").trim();
    const nextMax = Number.parseInt(raw, 10);
    if (!Number.isFinite(nextMax) || nextMax < 1) {
      setError("Лимит должен быть целым числом больше 0.");
      return;
    }
    setSavingCity(city);
    setError(null);
    setInfo(null);
    try {
      const { error: updErr } = await adminSetPioneerCityMax(city, nextMax);
      if (updErr) throw updErr;
      setSlots((prev) =>
        prev.map((r) => (r.city === city ? { ...r, max_count: nextMax } : r)),
      );
      setDraftMax((prev) => ({ ...prev, [city]: String(nextMax) }));
      const {
        data: { user },
      } = await adminGetAuthUser();
      await adminInsertAuditLog({
        actor_auth_user_id: user?.id ?? null,
        action: "pioneer_promo.set_city_max",
        target_type: "city_pioneer_slots",
        target_id: city,
        payload: { max_count: nextMax },
      });
      setInfo(`Лимит для «${city}» сохранён: ${nextMax}.`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Не удалось сохранить лимит.");
    } finally {
      setSavingCity(null);
    }
  };

  return (
    <AdminShell>
      <div className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Акция</h1>
            <p className="text-sm text-slate-600">
              Первые в городе получают бесплатный Pro+ на 90 дней. Пермь — 100
              слотов, остальные города — 50, пока не измените лимит.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 hover:bg-slate-50 disabled:opacity-60"
            disabled={loading}
          >
            Обновить
          </button>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Пионерская акция
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                {enabled
                  ? "Включена: квиз выдаёт Pro+ и показывает остаток слотов."
                  : "Выключена: слот не выдаётся, подсказка в квизе скрыта."}
              </p>
              {updatedAt ? (
                <p className="mt-1 text-xs text-slate-500">
                  Обновлено: {new Date(updatedAt).toLocaleString("ru-RU")}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              aria-label="Пионерская акция"
              onClick={() => void togglePromo()}
              disabled={busy || loading}
              className={`relative inline-flex h-11 w-[4.5rem] shrink-0 items-center rounded-full px-1 transition disabled:opacity-60 ${
                enabled ? "bg-emerald-600" : "bg-slate-300"
              }`}
            >
              <span
                className={`inline-block h-9 w-9 rounded-full bg-white shadow-sm transition ${
                  enabled ? "translate-x-7" : "translate-x-0"
                }`}
              />
            </button>
          </div>
          {permRow ? (
            <p className="mt-4 rounded-xl bg-emerald-50 px-3 py-2 text-xs leading-snug text-emerald-800">
              Пермь: занято {permRow.used_count} из {permRow.max_count}, осталось{" "}
              {remainingOf(permRow)}.
            </p>
          ) : null}
          {error ? (
            <p className="mt-3 text-sm font-medium text-rose-700">{error}</p>
          ) : null}
          {info ? (
            <p className="mt-3 text-sm font-medium text-emerald-700">{info}</p>
          ) : null}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900">
            Лимиты по городам
          </div>
          {loading ? (
            <p className="px-4 py-4 text-sm text-slate-500">Загрузка…</p>
          ) : slots.length === 0 ? (
            <p className="px-4 py-4 text-sm text-slate-500">
              Строк слотов ещё нет. После SQL для Перми появится лимит 100.
            </p>
          ) : (
            <div className="max-h-[70vh] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white text-left text-xs text-slate-500">
                  <tr className="border-b border-slate-200">
                    <th className="px-4 py-2">Город</th>
                    <th className="px-4 py-2">Занято</th>
                    <th className="px-4 py-2">Лимит</th>
                    <th className="px-4 py-2">Осталось</th>
                    <th className="px-4 py-2">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {slots.map((r) => {
                    const dirty =
                      (draftMax[r.city] ?? "") !== String(r.max_count);
                    return (
                      <tr key={r.city} className="border-b border-slate-100">
                        <td className="px-4 py-2 font-medium text-slate-900">
                          {r.city}
                        </td>
                        <td className="px-4 py-2 text-slate-700">
                          {r.used_count}
                        </td>
                        <td className="px-4 py-2">
                          <input
                            inputMode="numeric"
                            value={draftMax[r.city] ?? ""}
                            onChange={(e) =>
                              setDraftMax((prev) => ({
                                ...prev,
                                [r.city]: e.target.value.replace(/[^\d]/g, ""),
                              }))
                            }
                            className="h-9 w-24 rounded-xl border border-slate-200 bg-white px-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
                          />
                        </td>
                        <td className="px-4 py-2 text-slate-700">
                          {remainingOf(r)}
                        </td>
                        <td className="px-4 py-2">
                          <button
                            type="button"
                            onClick={() => void saveCityMax(r.city)}
                            disabled={
                              !dirty || savingCity === r.city || busy
                            }
                            className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-40"
                          >
                            {savingCity === r.city ? "Сохраняем…" : "Сохранить"}
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
