"use client";

import { useMemo, useRef, useState } from "react";
import { SelectOverlay } from "@/components/select/SelectOverlay";
import type { SelectOption } from "@/components/select/types";
import {
  RUSSIA_LABEL,
  SORTED_CITY_OPTIONS,
  normalizeCityQuery,
} from "@/data/cities";

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
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const isPlaceholder = !(value && value.trim());

  const options: SelectOption[] = useMemo(
    () => SORTED_CITY_OPTIONS.map((city) => ({ value: city, label: city })),
    [],
  );

  const handleSelect = (city: string) => {
    onChange(city);
    setOpen(false);
  };

  const listHeader = includeRussia ? (
    <>
      <button
        type="button"
        onClick={() => handleSelect(RUSSIA_LABEL)}
        className="flex min-h-11 w-full items-center rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-800 hover:bg-[#009966]/10 lg:min-h-9 lg:px-2 lg:py-1.5 lg:text-[11px]"
      >
        {RUSSIA_LABEL}
      </button>
      <div className="my-1 h-px bg-slate-100" />
    </>
  ) : undefined;

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-12 w-full items-center justify-between rounded-xl border border-gray-300 bg-white px-3 py-0 text-sm text-slate-900 shadow-sm hover:border-[#009966]/60 focus:border-[#009966] focus:ring-1 focus:ring-[#009966]"
      >
        <span
          className={
            "truncate " + (isPlaceholder ? "text-slate-400" : "text-slate-900")
          }
        >
          {value ? value : placeholder}
        </span>
        <span className="ml-2 text-[10px] text-slate-500">
          {open ? "▲" : "▼"}
        </span>
      </button>

      {open ? (
        <SelectOverlay
          open={open}
          onClose={() => setOpen(false)}
          anchorRef={triggerRef}
          title={placeholder}
          options={options}
          value={value}
          onSelect={handleSelect}
          searchable
          searchPlaceholder="Найти город"
          variant="profile"
          listHeader={listHeader}
          filterOption={(opt, q) =>
            normalizeCityQuery(opt.label).includes(normalizeCityQuery(q))
          }
        />
      ) : null}
    </div>
  );
}
