"use client";

import { useMemo, useRef, useState } from "react";
import { useSelectedCity } from "@/contexts/SelectedCityContext";
import { RUSSIA_LABEL, SORTED_CITY_OPTIONS } from "@/data/cities";
import { SelectOverlay } from "@/components/select/SelectOverlay";
import type { SelectOption } from "@/components/select/types";

type TopBarCitySelectProps = {
  onCityChosen?: (city: string) => void;
  highlight?: boolean;
};

export function TopBarCitySelect({
  onCityChosen,
  highlight = false,
}: TopBarCitySelectProps) {
  const { selectedCity, setSelectedCity } = useSelectedCity();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const options: SelectOption[] = useMemo(
    () => SORTED_CITY_OPTIONS.map((city) => ({ value: city, label: city })),
    [],
  );

  const handleSelect = (city: string) => {
    setSelectedCity(city);
    onCityChosen?.(city);
    setOpen(false);
  };

  const listHeader = (
    <>
      <button
        type="button"
        onClick={() => handleSelect(RUSSIA_LABEL)}
        className="flex min-h-11 w-full items-center rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-800 hover:bg-slate-50 lg:min-h-9 lg:px-2 lg:py-1.5 lg:text-[11px]"
      >
        {RUSSIA_LABEL}
      </button>
      <div className="my-1 h-px bg-slate-100" />
    </>
  );

  return (
    <div className="relative w-full min-w-[10rem] max-w-[12rem] sm:w-48 sm:max-w-none">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center justify-between rounded-full border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50/40 hover:text-emerald-800 sm:text-[11px] ${
          highlight ? "ring-2 ring-emerald-400 ring-offset-1" : ""
        }`}
      >
        <span className="truncate">
          {selectedCity ? selectedCity : "Выберите город"}
        </span>
        <span className="ml-2 shrink-0 text-[10px] text-slate-400">
          {open ? "▲" : "▼"}
        </span>
      </button>

      {open ? (
        <SelectOverlay
          open={open}
          onClose={() => setOpen(false)}
          anchorRef={triggerRef}
          title="Выберите город"
          options={options}
          value={selectedCity}
          onSelect={handleSelect}
          searchable
          searchPlaceholder="Найти город"
          variant="default"
          listHeader={listHeader}
          filterOption={(opt, q) =>
            opt.label.toLowerCase().includes(q.trim().toLowerCase())
          }
        />
      ) : null}
    </div>
  );
}
