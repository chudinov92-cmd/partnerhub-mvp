"use client";

import { useMemo, useRef, useState } from "react";
import { SelectOverlay } from "@/components/select/SelectOverlay";

export type DropdownSelectOption = {
  value: string;
  label: string;
};

export function DropdownSelect({
  value,
  onChange,
  options,
  placeholder,
  title,
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
  title?: string;
  className?: string;
  menuClassName?: string;
  disabled?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  variant?: "default" | "profile";
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const labelByValue = useMemo(() => {
    const map = new Map(options.map((o) => [o.value, o.label]));
    return map;
  }, [options]);

  const currentLabel =
    value != null && value !== "" ? labelByValue.get(value) : undefined;

  const isProfile = variant === "profile";
  const isPlaceholder = currentLabel == null;
  const sheetTitle = title ?? placeholder;

  return (
    <div className={"relative " + (className ?? "")}>
      <button
        ref={triggerRef}
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
        <span
          className={
            "truncate " + (isPlaceholder ? "text-slate-400" : "text-slate-900")
          }
        >
          {currentLabel ?? placeholder}
        </span>
        <span className="ml-2 text-[10px] text-slate-500">
          {open ? "▲" : "▼"}
        </span>
      </button>

      {open && !disabled ? (
        <SelectOverlay
          open={open}
          onClose={() => setOpen(false)}
          anchorRef={triggerRef}
          title={sheetTitle}
          options={options}
          value={value}
          onSelect={onChange}
          searchable={searchable}
          searchPlaceholder={searchPlaceholder}
          variant={variant}
          menuClassName={menuClassName}
        />
      ) : null}
    </div>
  );
}
