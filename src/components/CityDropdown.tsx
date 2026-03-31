"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { RUSSIA_LABEL, SORTED_CITY_OPTIONS, normalizeCityQuery } from "@/data/cities";

export function CityDropdown({
  value,
  onChange,
  includeRussia = false,
  placeholder = "Выберите город",
}: {
  value: string | null | undefined;
  onChange: (city: string) => void;
  includeRussia?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement | null>(null);
  const isPlaceholder = !(value && value.trim());

  useEffect(() => {
    if (!open) return;
    const onDocMouseDown = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const visibleCities = useMemo(() => {
    const q = normalizeCityQuery(query);
    if (!q) return SORTED_CITY_OPTIONS;
    return SORTED_CITY_OPTIONS.filter((c) => normalizeCityQuery(c).includes(q));
  }, [query]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-xl border border-gray-300 bg-white px-3 h-12 py-0 text-sm text-slate-900 shadow-sm focus:border-[#009966] focus:ring-1 focus:ring-[#009966] hover:border-[#009966]/60"
      >
        <span className={"truncate " + (isPlaceholder ? "text-slate-400" : "text-slate-900")}>
          {value ? value : placeholder}
        </span>
        <span className="ml-2 text-[10px] text-slate-500">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="pointer-events-auto absolute left-0 top-[calc(100%+6px)] z-[2000] w-full rounded-xl border border-gray-200 bg-white py-1 text-xs shadow-xl">
          <div className="px-2 pb-1">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Найти город"
              className="h-7 w-full rounded-full border border-gray-200 px-2 text-[11px] text-slate-700 outline-none focus:border-[#009966] focus:ring-1 focus:ring-[#009966]"
            />
          </div>
          <div className="max-h-[560px] overflow-y-auto px-1 pb-1">
            {includeRussia && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    onChange(RUSSIA_LABEL);
                    setOpen(false);
                    setQuery("");
                  }}
                  className="flex w-full items-center justify-between rounded-lg px-2 py-1 text-[11px] font-medium text-slate-800 hover:bg-[#009966]/10"
                >
                  <span>{RUSSIA_LABEL}</span>
                </button>
                <div className="my-1 h-px bg-slate-100" />
              </>
            )}

            {visibleCities.length === 0 ? (
              <p className="px-2 py-1 text-[11px] text-slate-400">Ничего не найдено</p>
            ) : (
              visibleCities.map((city) => (
                <button
                  key={city}
                  type="button"
                  onClick={() => {
                    onChange(city);
                    setOpen(false);
                    setQuery("");
                  }}
                  className="flex w-full items-center rounded-lg px-2 py-1 text-left text-[11px] text-slate-700 hover:bg-[#009966]/10"
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

