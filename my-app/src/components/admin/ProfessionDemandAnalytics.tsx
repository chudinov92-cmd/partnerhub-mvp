"use client";

import { useCallback, useMemo, useState } from "react";
import {
  fetchMapSearchMatrix,
  fetchProfileDemandMatrix,
  type DemandMatrixRow,
} from "@/services/analyticsService";

function toDateInputValue(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function DemandTable({
  rows,
  countKey,
  countLabel,
}: {
  rows: DemandMatrixRow[];
  countKey: "user_count" | "event_count";
  countLabel: string;
}) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-slate-500">Нет данных по выбранным фильтрам.</p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-600">
          <tr>
            <th className="px-3 py-2">Профессия ищущего</th>
            <th className="px-3 py-2">Искомая профессия</th>
            <th className="px-3 py-2 text-right">{countLabel}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr
              key={`${row.seeker_role}-${row.target_profession}-${idx}`}
              className="border-t border-slate-100"
            >
              <td className="px-3 py-2 text-slate-900">{row.seeker_role}</td>
              <td className="px-3 py-2 text-slate-800">{row.target_profession}</td>
              <td className="px-3 py-2 text-right tabular-nums font-medium text-slate-900">
                {row[countKey] ?? 0}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SliceFilters({
  city,
  setCity,
  country,
  setCountry,
  ageFrom,
  setAgeFrom,
  ageTo,
  setAgeTo,
  isPro,
  setIsPro,
  cityLabel = "Город",
  cityPlaceholder = "Любой",
}: {
  city: string;
  setCity: (v: string) => void;
  country: string;
  setCountry: (v: string) => void;
  ageFrom: string;
  setAgeFrom: (v: string) => void;
  ageTo: string;
  setAgeTo: (v: string) => void;
  isPro: "" | "true" | "false";
  setIsPro: (v: "" | "true" | "false") => void;
  cityLabel?: string;
  cityPlaceholder?: string;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-700">
          {cityLabel}
        </label>
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder={cityPlaceholder}
          className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-700">
          Страна
        </label>
        <input
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          placeholder="Любая"
          className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-700">
          Возраст от
        </label>
        <input
          type="number"
          min={0}
          value={ageFrom}
          onChange={(e) => setAgeFrom(e.target.value)}
          placeholder="—"
          className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-700">
          Возраст до
        </label>
        <input
          type="number"
          min={0}
          value={ageTo}
          onChange={(e) => setAgeTo(e.target.value)}
          placeholder="—"
          className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-700">
          Pro / Free
        </label>
        <select
          value={isPro}
          onChange={(e) => setIsPro(e.target.value as "" | "true" | "false")}
          className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
        >
          <option value="">Все</option>
          <option value="true">Pro</option>
          <option value="false">Free</option>
        </select>
      </div>
    </div>
  );
}

export function ProfessionDemandAnalytics() {
  const today = useMemo(() => new Date(), []);
  const defaultFrom = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return toDateInputValue(d);
  }, []);
  const defaultTo = useMemo(() => toDateInputValue(today), [today]);

  const [tab, setTab] = useState<"profile" | "map">("profile");

  const [profileCity, setProfileCity] = useState("");
  const [profileCountry, setProfileCountry] = useState("");
  const [profileAgeFrom, setProfileAgeFrom] = useState("");
  const [profileAgeTo, setProfileAgeTo] = useState("");
  const [profileIsPro, setProfileIsPro] = useState<"" | "true" | "false">("");
  const [activeOnly, setActiveOnly] = useState(false);
  const [profileActiveFrom, setProfileActiveFrom] = useState(defaultFrom);
  const [profileActiveTo, setProfileActiveTo] = useState(defaultTo);

  const [mapFrom, setMapFrom] = useState(defaultFrom);
  const [mapTo, setMapTo] = useState(defaultTo);
  const [mapCity, setMapCity] = useState("");
  const [mapCountry, setMapCountry] = useState("");
  const [mapAgeFrom, setMapAgeFrom] = useState("");
  const [mapAgeTo, setMapAgeTo] = useState("");
  const [mapIsPro, setMapIsPro] = useState<"" | "true" | "false">("");
  const [authFilter, setAuthFilter] = useState<"all" | "authed" | "guest">(
    "all",
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profileRows, setProfileRows] = useState<DemandMatrixRow[]>([]);
  const [mapRows, setMapRows] = useState<DemandMatrixRow[]>([]);

  const parseOptionalInt = (raw: string) => {
    const n = Number(raw);
    return raw.trim() && Number.isFinite(n) ? n : null;
  };

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchProfileDemandMatrix({
        city: profileCity.trim() || null,
        country: profileCountry.trim() || null,
        age_from: parseOptionalInt(profileAgeFrom),
        age_to: parseOptionalInt(profileAgeTo),
        is_pro:
          profileIsPro === "true"
            ? true
            : profileIsPro === "false"
              ? false
              : null,
        active_only: activeOnly,
        active_from: activeOnly ? profileActiveFrom : null,
        active_to: activeOnly ? profileActiveTo : null,
      });
      setProfileRows(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
      setProfileRows([]);
    } finally {
      setLoading(false);
    }
  }, [
    profileCity,
    profileCountry,
    profileAgeFrom,
    profileAgeTo,
    profileIsPro,
    activeOnly,
    profileActiveFrom,
    profileActiveTo,
  ]);

  const loadMap = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchMapSearchMatrix({
        from: mapFrom,
        to: mapTo,
        city_context: mapCity.trim() || null,
        country: mapCountry.trim() || null,
        age_from: parseOptionalInt(mapAgeFrom),
        age_to: parseOptionalInt(mapAgeTo),
        is_pro:
          mapIsPro === "true" ? true : mapIsPro === "false" ? false : null,
        auth_filter: authFilter,
      });
      setMapRows(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
      setMapRows([]);
    } finally {
      setLoading(false);
    }
  }, [
    mapFrom,
    mapTo,
    mapCity,
    mapCountry,
    mapAgeFrom,
    mapAgeTo,
    mapIsPro,
    authFilter,
  ]);

  const handleApply = () => {
    if (tab === "profile") void loadProfile();
    else void loadMap();
  };

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Кто кого ищет (профессии)
          </h2>
          <p className="text-xs text-slate-600">
            Спрос из профилей и поиски через фильтр карты.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setTab("profile")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
              tab === "profile"
                ? "bg-slate-900 text-white"
                : "border border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            Спрос в профилях
          </button>
          <button
            type="button"
            onClick={() => setTab("map")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
              tab === "map"
                ? "bg-slate-900 text-white"
                : "border border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            Поиск на карте
          </button>
        </div>
      </div>

      {tab === "profile" ? (
        <div className="space-y-3">
          <p className="text-xs text-slate-500">
            Режим A: текущий спрос (данные на сейчас). Включите «Только активные
            за период» для режима B (фильтр по last_seen_at).
          </p>
          <SliceFilters
            city={profileCity}
            setCity={setProfileCity}
            country={profileCountry}
            setCountry={setProfileCountry}
            ageFrom={profileAgeFrom}
            setAgeFrom={setProfileAgeFrom}
            ageTo={profileAgeTo}
            setAgeTo={setProfileAgeTo}
            isPro={profileIsPro}
            setIsPro={setProfileIsPro}
          />
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={activeOnly}
              onChange={(e) => setActiveOnly(e.target.checked)}
              className="rounded border-slate-300"
            />
            Только пользователи, активные за период
          </label>
          {activeOnly ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Активность от
                </label>
                <input
                  type="date"
                  value={profileActiveFrom}
                  onChange={(e) => setProfileActiveFrom(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Активность до
                </label>
                <input
                  type="date"
                  value={profileActiveTo}
                  onChange={(e) => setProfileActiveTo(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm"
                />
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-slate-500">
            События «Поиск» на карте с выбранной профессией. Период обязателен.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Период от
              </label>
              <input
                type="date"
                value={mapFrom}
                onChange={(e) => setMapFrom(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Период до
              </label>
              <input
                type="date"
                value={mapTo}
                onChange={(e) => setMapTo(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Авторизация
              </label>
              <select
                value={authFilter}
                onChange={(e) =>
                  setAuthFilter(e.target.value as "all" | "authed" | "guest")
                }
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
              >
                <option value="all">Все</option>
                <option value="authed">Только авторизованные</option>
                <option value="guest">Только гости</option>
              </select>
            </div>
          </div>
          <SliceFilters
            city={mapCity}
            setCity={setMapCity}
            country={mapCountry}
            setCountry={setMapCountry}
            ageFrom={mapAgeFrom}
            setAgeFrom={setMapAgeFrom}
            ageTo={mapAgeTo}
            setAgeTo={setMapAgeTo}
            isPro={mapIsPro}
            setIsPro={setMapIsPro}
            cityLabel="Город на карте"
            cityPlaceholder="Любой (Россия, Москва…)"
          />
        </div>
      )}

      <button
        type="button"
        onClick={handleApply}
        disabled={loading}
        className="inline-flex h-10 items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
      >
        {loading ? "Загрузка…" : "Применить"}
      </button>

      {error ? <p className="text-sm font-medium text-rose-700">{error}</p> : null}

      {tab === "profile" ? (
        <DemandTable
          rows={profileRows}
          countKey="user_count"
          countLabel="Пользователей"
        />
      ) : (
        <DemandTable
          rows={mapRows}
          countKey="event_count"
          countLabel="Поисков"
        />
      )}
    </div>
  );
}
