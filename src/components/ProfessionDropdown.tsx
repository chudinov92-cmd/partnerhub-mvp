"use client";

import { useMemo, useRef, useState } from "react";
import { SelectOverlay } from "@/components/select/SelectOverlay";
import type { SelectOption } from "@/components/select/types";
import {
  OTHER_PROFESSION_LABEL,
  type ProfessionCatalogRow,
} from "@/lib/professionCatalog";

function normalizeQuery(raw: string) {
  return (raw ?? "").trim().toLowerCase();
}

export function ProfessionDropdown({
  value,
  onChange,
  placeholder = "Выберите профессию",
  catalog,
  disabled = false,
}: {
  value: string | null | undefined;
  onChange: (label: string) => void;
  placeholder?: string;
  catalog: ProfessionCatalogRow[];
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const isPlaceholder = !(value && value.trim());

  const options: SelectOption[] = useMemo(() => {
    const labels = catalog
      .map((r) => r.label)
      .filter((l) => l && l !== OTHER_PROFESSION_LABEL && l !== "Другое…");
    labels.sort((a, b) => a.localeCompare(b, "ru"));
    return [...labels, OTHER_PROFESSION_LABEL].map((label) => ({
      value: label,
      label,
    }));
  }, [catalog]);

  const handleSelect = (label: string) => {
    onChange(label);
  };

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setOpen((v) => !v);
        }}
        className={
          "flex h-12 w-full items-center justify-between rounded-xl border border-gray-300 bg-white px-3 py-0 text-sm text-slate-900 shadow-sm hover:border-[#009966]/60 focus:border-[#009966] focus:ring-1 focus:ring-[#009966] " +
          (disabled ? "cursor-not-allowed opacity-60" : "")
        }
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
          searchPlaceholder="Найти профессию"
          variant="profile"
          filterOption={(opt, q) => {
            const nq = normalizeQuery(q);
            if (!nq) return true;
            if (opt.value === OTHER_PROFESSION_LABEL) return true;
            return normalizeQuery(opt.label).includes(nq);
          }}
          renderListExtras={({ search, visibleOptions }) => {
            const q = normalizeQuery(search);
            if (!q) return null;
            const hasCatalogMatch = visibleOptions.some(
              (opt) => opt.value !== OTHER_PROFESSION_LABEL,
            );
            if (hasCatalogMatch) return null;
            return (
              <p className="px-3 py-2 text-sm leading-snug text-slate-500 lg:px-2 lg:py-1.5 lg:text-[11px]">
                Нет вашей профессии? Выберите «Другое» и впишите её — мы добавим
                её в базу в течение суток.
              </p>
            );
          }}
        />
      ) : null}
    </div>
  );
}
