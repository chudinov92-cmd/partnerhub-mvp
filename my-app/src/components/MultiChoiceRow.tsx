"use client";

import type { ReactNode } from "react";

type MultiChoiceRowProps = {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
};

export function MultiChoiceRow({
  selected,
  onClick,
  children,
  className = "",
}: MultiChoiceRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={
        "flex min-h-12 w-full items-center gap-3 rounded-2xl border px-3.5 text-left text-sm font-medium transition " +
        (selected
          ? "border-[#009966] bg-[#009966]/10 text-slate-900"
          : "border-slate-200 bg-white text-slate-700 active:bg-slate-50") +
        (className ? ` ${className}` : "")
      }
    >
      <span
        className={
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-[11px] " +
          (selected
            ? "border-[#009966] bg-[#009966] text-white"
            : "border-slate-300 bg-white text-transparent")
        }
        aria-hidden
      >
        ✓
      </span>
      {children}
    </button>
  );
}
