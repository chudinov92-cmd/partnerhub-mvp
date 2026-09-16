"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { OTHER_PROFESSION_LABEL, type ProfessionCatalogRow } from "@/lib/professionCatalog";

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

  const sortedLabels = useMemo(() => {
    const labels = catalog
      .map((r) => r.label)
      .filter((l) => l && l !== OTHER_PROFESSION_LABEL && l !== "Другое…");
    labels.sort((a, b) => a.localeCompare(b, "ru"));
    return [...labels, OTHER_PROFESSION_LABEL];
  }, [catalog]);

  const { visible, showOtherHint } = useMemo(() => {
    const q = normalizeQuery(query);
    if (!q) return { visible: sortedLabels, showOtherHint: false };

    const catalogMatches = sortedLabels.filter(
      (l) => l !== OTHER_PROFESSION_LABEL && normalizeQuery(l).includes(q),
    );
    const matches =
      catalogMatches.length > 0
        ? [...catalogMatches, OTHER_PROFESSION_LABEL]
        : [OTHER_PROFESSION_LABEL];

    return {
      visible: matches,
      showOtherHint: catalogMatches.length === 0,
    };
  }, [query, sortedLabels]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setOpen((v) => !v);
        }}
        className={
          "flex w-full items-center justify-between rounded-xl border border-gray-300 bg-white px-3 h-12 py-0 text-sm text-slate-900 shadow-sm focus:border-[#009966] focus:ring-1 focus:ring-[#009966] hover:border-[#009966]/60 " +
          (disabled ? "cursor-not-allowed opacity-60" : "")
        }
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
              placeholder="Найти профессию"
              className="h-9 w-full rounded-full border border-gray-200 px-3 text-base text-slate-900 outline-none focus:border-[#009966] focus:ring-1 focus:ring-[#009966] sm:h-7 sm:px-2 sm:text-[11px] sm:text-slate-700"
            />
          </div>
          <div className="max-h-[560px] overflow-y-auto px-1 pb-1">
            {showOtherHint ? (
              <p className="px-2 py-1.5 text-[11px] leading-snug text-slate-500">
                Нет вашей профессии? Выберите «Другое» и впишите её — мы добавим её в базу в
                течение суток.
              </p>
            ) : null}
            {visible.map((label) => (
              <button
                key={label}
                type="button"
                onClick={() => {
                  onChange(label);
                  setOpen(false);
                  setQuery("");
                }}
                className={
                  "flex w-full items-center rounded-lg px-2 py-1 text-left text-[11px] hover:bg-[#009966]/10 " +
                  (label === OTHER_PROFESSION_LABEL ? "font-medium text-slate-800" : "text-slate-700")
                }
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

