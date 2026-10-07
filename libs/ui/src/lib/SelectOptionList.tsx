"use client";

import type { ReactNode, RefObject } from "react";
import type { SelectOption, SelectVariant } from "./types";

export function SelectOptionList({
  options,
  value,
  onSelect,
  variant = "default",
  listHeader,
  emptyHint,
  emptyMessage = "Ничего не найдено",
  listRef,
  compact = false,
}: {
  options: SelectOption[];
  value?: string | null;
  onSelect: (value: string) => void;
  variant?: SelectVariant;
  listHeader?: ReactNode;
  emptyHint?: ReactNode;
  emptyMessage?: string;
  listRef?: RefObject<HTMLDivElement | null>;
  compact?: boolean;
}) {
  const isProfile = variant === "profile";

  return (
    <>
      {listHeader}
      {emptyHint}
      {options.length === 0 ? (
        <p
          className={
            compact
              ? "px-2 py-1 text-[11px] text-slate-400"
              : "px-3 py-2 text-sm text-slate-400"
          }
        >
          {emptyMessage}
        </p>
      ) : null}
      {options.map((opt) => {
        const active = opt.value === (value ?? "");
        return (
          <button
            key={opt.value || "__empty__"}
            type="button"
            onClick={() => onSelect(opt.value)}
            className={
              "flex w-full items-center rounded-lg text-left hover:bg-slate-50 " +
              (compact
                ? "min-h-9 px-2 py-1.5 text-sm"
                : "min-h-11 px-3 py-2.5 text-sm") +
              (isProfile
                ? active
                  ? " bg-[#009966]/15 text-[#009966]"
                  : " text-slate-800 hover:bg-[#009966]/10"
                : active
                  ? " bg-sky-50 text-sky-800"
                  : " text-slate-700")
            }
          >
            <span className="truncate">{opt.label}</span>
          </button>
        );
      })}
    </>
  );
}
