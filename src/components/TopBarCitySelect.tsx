"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSelectedCity } from "@/contexts/SelectedCityContext";
import { RUSSIA_LABEL, SORTED_CITY_OPTIONS } from "@/data/cities";

export function TopBarCitySelect() {
  const { selectedCity, setSelectedCity } = useSelectedCity();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement | null>(null);

  const visibleCities = useMemo(
    () =>
      SORTED_CITY_OPTIONS.filter((city) =>
        city.toLowerCase().includes(search.toLowerCase()),
      ),
    [search],
  );

  useEffect(() => {
    if (!open) return;

    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setSearch("");
      }
    };

    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div
      ref={ref}
      className="relative w-full min-w-[10rem] max-w-[12rem] sm:w-48 sm:max-w-none"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-full border border-gray-200 bg-white px-3 py-2 text-[11px] font-medium text-slate-700 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50/40 hover:text-emerald-800"
      >
        <span className="truncate">
          {selectedCity ? selectedCity : "Выберите город"}
        </span>
        <span className="ml-2 shrink-0 text-[10px] text-slate-400">
          {open ? "▲" : "▼"}
        </span>
      </button>

      {open && (
        <div className="absolute left-1/2 top-[calc(100%+0.25rem)] z-[1600] w-56 max-w-[min(100vw-1rem,14rem)] -translate-x-1/2 rounded-xl border border-slate-200 bg-white py-1 text-xs shadow-lg sm:max-w-none">
          <div className="px-2 pb-1">
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Найти город"
              className="h-7 w-full rounded-full border border-slate-200 px-2 text-[11px] text-slate-700 outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400"
            />
          </div>
          <div className="max-h-[min(60vh,280px)] overflow-y-auto px-1 pb-1">
            <button
              type="button"
              onClick={() => {
                setSelectedCity(RUSSIA_LABEL);
                setOpen(false);
                setSearch("");
              }}
              className="flex w-full items-center justify-between rounded-lg px-2 py-1 text-[11px] font-medium text-slate-800 hover:bg-slate-50"
            >
              <span>{RUSSIA_LABEL}</span>
            </button>
            <div className="my-1 h-px bg-slate-100" />
            {visibleCities.length === 0 ? (
              <p className="px-2 py-1 text-[11px] text-slate-400">
                Ничего не найдено
              </p>
            ) : (
              visibleCities.map((city) => (
                <button
                  key={city}
                  type="button"
                  onClick={() => {
                    setSelectedCity(city);
                    setOpen(false);
                    setSearch("");
                  }}
                  className="flex w-full items-center rounded-lg px-2 py-1 text-left text-[11px] text-slate-700 hover:bg-slate-50"
                >
                  {city}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
