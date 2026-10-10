"use client";

import { useEffect, useRef, useState } from "react";
import type { SelectVariant } from "./types";

export function SelectSearchField({
  value,
  onChange,
  placeholder,
  variant = "default",
  autoFocusOnDesktop = false,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  variant?: SelectVariant;
  autoFocusOnDesktop?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [searchActive, setSearchActive] = useState(false);
  const isTouchRef = useRef(false);
  const isProfile = variant === "profile";

  useEffect(() => {
    isTouchRef.current =
      "ontouchstart" in window || navigator.maxTouchPoints > 0;
  }, []);

  useEffect(() => {
    if (searchActive && inputRef.current) {
      inputRef.current.focus({ preventScroll: true });
    }
  }, [searchActive]);

  useEffect(() => {
    if (!autoFocusOnDesktop || !inputRef.current) return;
    if (!isTouchRef.current) {
      inputRef.current.focus({ preventScroll: true });
    }
  }, [autoFocusOnDesktop]);

  const inputClassName =
    "h-11 w-full rounded-full border px-3 text-base text-slate-900 placeholder:text-slate-400 outline-none lg:h-9 lg:px-3 lg:text-sm " +
    (isProfile
      ? "border-gray-200 focus:border-[#009966] focus:ring-1 focus:ring-[#009966]"
      : "border-slate-200 focus:border-sky-400 focus:ring-1 focus:ring-sky-400");

  const fakeClassName =
    "flex h-11 w-full items-center rounded-full border px-3 text-base text-slate-400 lg:h-9 lg:px-3 lg:text-sm " +
    (isProfile ? "border-gray-200" : "border-slate-200");

  if (isTouchRef.current && !searchActive) {
    return (
      <div
        role="button"
        tabIndex={-1}
        onClick={() => setSearchActive(true)}
        className={fakeClassName}
      >
        {placeholder}
      </div>
    );
  }

  return (
    <input
      ref={inputRef}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={inputClassName}
    />
  );
}
