"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type DropdownSelectOption = {
  value: string;
  label: string;
};

export function DropdownSelect({
  value,
  onChange,
  options,
  placeholder,
  className,
  menuClassName,
  disabled,
}: {
  value: string | null | undefined;
  onChange: (value: string) => void;
  options: DropdownSelectOption[];
  placeholder: string;
  className?: string;
  menuClassName?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

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

  const labelByValue = useMemo(() => {
    const map = new Map(options.map((o) => [o.value, o.label]));
    return map;
  }, [options]);

  const currentLabel =
    value != null && value !== "" ? labelByValue.get(value) : undefined;

  return (
    <div ref={ref} className={"relative " + (className ?? "")}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={
          "flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 disabled:bg-slate-50 disabled:text-slate-400"
        }
      >
        <span className="truncate">
          {currentLabel ?? placeholder}
        </span>
        <span className="ml-2 text-[10px] text-slate-400">
          {open ? "▲" : "▼"}
        </span>
      </button>

      {open && !disabled && (
        <div
          className={
            "pointer-events-auto absolute left-0 top-[calc(100%+6px)] z-[2000] w-full rounded-xl border border-slate-200 bg-white p-1 shadow-xl " +
            (menuClassName ?? "")
          }
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="max-h-[560px] overflow-y-auto">
            {options.map((opt) => {
              const active = opt.value === (value ?? "");
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={
                    "flex w-full items-center rounded-lg px-2 py-1 text-left text-sm hover:bg-slate-50 " +
                    (active ? "bg-sky-50 text-sky-800" : "text-slate-700")
                  }
                >
                  <span className="truncate">{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

