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
  searchable,
  searchPlaceholder,
  variant = "default",
}: {
  value: string | null | undefined;
  onChange: (value: string) => void;
  options: DropdownSelectOption[];
  placeholder: string;
  className?: string;
  menuClassName?: string;
  disabled?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  variant?: "default" | "profile";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const [search, setSearch] = useState("");
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const [searchActive, setSearchActive] = useState(false);
  const isTouchRef = useRef(false);

  useEffect(() => {
    isTouchRef.current = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }, []);

  useEffect(() => {
    if (!open) { setSearchActive(false); return; }
    if (!searchable || !searchInputRef.current) return;
    if (!isTouchRef.current) {
      searchInputRef.current.focus({ preventScroll: true });
    }
  }, [open, searchable]);

  useEffect(() => {
    if (searchActive && searchInputRef.current) {
      searchInputRef.current.focus({ preventScroll: true });
    }
  }, [searchActive]);

  useEffect(() => {
    if (!open) return;
    const listEl = listRef.current;
    if (!listEl) return;

    const blurOnTouch = () => {
      const inputEl = searchInputRef.current;
      if (inputEl && document.activeElement === inputEl) {
        inputEl.blur();
      }
    };

    listEl.addEventListener('touchstart', blurOnTouch, { passive: true });
    return () => listEl.removeEventListener('touchstart', blurOnTouch);
  }, [open]);

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

  useEffect(() => {
    if (!open) {
      setSearch("");
    }
  }, [open]);

  const labelByValue = useMemo(() => {
    const map = new Map(options.map((o) => [o.value, o.label]));
    return map;
  }, [options]);

  const currentLabel =
    value != null && value !== "" ? labelByValue.get(value) : undefined;

  const visibleOptions = useMemo(() => {
    if (!searchable) return options;
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter((opt) =>
      opt.label.toLowerCase().includes(q),
    );
  }, [options, searchable, search]);

  const isProfile = variant === "profile";
  const isPlaceholder = currentLabel == null;

  return (
    <div ref={ref} className={"relative " + (className ?? "")}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={
          "flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none disabled:bg-slate-50 disabled:text-slate-400 " +
          (isProfile
            ? "h-12 rounded-xl border-gray-300 focus:border-[#009966] focus:ring-1 focus:ring-[#009966]"
            : "focus:border-sky-500 focus:ring-1 focus:ring-sky-500")
        }
      >
        <span className={"truncate " + (isPlaceholder ? "text-slate-400" : "text-slate-900")}>
          {currentLabel ?? placeholder}
        </span>
        <span className="ml-2 text-[10px] text-slate-500">
          {open ? "▲" : "▼"}
        </span>
      </button>

      {open && !disabled && (
        <div
          className={
            "pointer-events-auto absolute left-0 top-[calc(100%+6px)] z-[2000] w-full rounded-xl border bg-white p-1 shadow-xl " +
            (isProfile ? "border-gray-200" : "border-slate-200") +
            (menuClassName ?? "")
          }
          onMouseDown={(e) => {
            e.stopPropagation();
            if (searchInputRef.current && document.activeElement === searchInputRef.current && e.target !== searchInputRef.current) {
              searchInputRef.current.blur();
            }
          }}
        >
          {searchable ? (
            <div className="px-2 pb-1">
              {isTouchRef.current && !searchActive ? (
                <div
                  role="button"
                  tabIndex={-1}
                  onClick={() => setSearchActive(true)}
                  className={
                    "h-9 w-full rounded-full border px-3 flex items-center text-base text-slate-400 sm:h-7 sm:px-2 sm:text-[11px] " +
                    (isProfile ? "border-gray-200" : "border-slate-200")
                  }
                >
                  {searchPlaceholder ?? "Найти"}
                </div>
              ) : (
                <input
                  ref={searchInputRef}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={searchPlaceholder ?? "Найти"}
                  className={
                    "h-9 w-full rounded-full border px-3 text-base text-slate-900 placeholder:text-slate-400 outline-none sm:h-7 sm:px-2 sm:text-[11px] sm:text-slate-700 " +
                    (isProfile
                      ? "border-gray-200 focus:border-[#009966] focus:ring-1 focus:ring-[#009966]"
                      : "border-slate-200 focus:border-sky-400 focus:ring-1 focus:ring-sky-400")
                  }
                />
              )}
            </div>
          ) : null}

          <div
            ref={listRef}
            className="overflow-y-auto"
            style={{ maxHeight: 'min(560px, 40vh)', overscrollBehavior: 'contain' }}
          >
            {visibleOptions.length === 0 ? (
              <p className="px-2 py-1 text-[11px] text-slate-400">
                Ничего не найдено
              </p>
            ) : null}

            {visibleOptions.map((opt) => {
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
                    (isProfile
                      ? active
                        ? "bg-[#009966]/15 text-[#009966]"
                        : "text-slate-800 hover:bg-[#009966]/10"
                      : active
                        ? "bg-sky-50 text-sky-800"
                        : "text-slate-700")
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

