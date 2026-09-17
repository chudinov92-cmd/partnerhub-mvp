"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import FocusTrap from "focus-trap-react";
import { useVisualViewportLayout } from "@/hooks/useMobileKeyboardInset";
import { useOverlayBodyLock } from "@/hooks/useOverlayBodyLock";
import { SelectOptionList } from "./SelectOptionList";
import { SelectSearchField } from "./SelectSearchField";
import {
  defaultFilterOption,
  shouldShowSearch,
  type SelectOverlayCommonProps,
} from "./types";

export function MobileSelectSheet({
  open,
  onClose,
  title,
  options,
  value,
  onSelect,
  searchable,
  searchPlaceholder = "Найти",
  variant = "default",
  listHeader,
  emptyHint,
  renderListExtras,
  emptyMessage,
  menuClassName,
  filterOption = defaultFilterOption,
}: SelectOverlayCommonProps & { title: string }) {
  const [search, setSearch] = useState("");
  const listRef = useRef<HTMLDivElement | null>(null);
  const { offsetTop, height } = useVisualViewportLayout();
  const showSearch = shouldShowSearch(searchable, options.length);

  useOverlayBodyLock(open);

  useEffect(() => {
    if (!open) {
      setSearch("");
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const listEl = listRef.current;
    if (!listEl) return;

    const blurSearchOnTouch = (e: TouchEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest("input")) return;
      const active = document.activeElement;
      if (active instanceof HTMLInputElement) {
        active.blur();
      }
    };

    listEl.addEventListener("touchstart", blurSearchOnTouch, { passive: true });
    return () => listEl.removeEventListener("touchstart", blurSearchOnTouch);
  }, [open]);

  const visibleOptions = useMemo(() => {
    if (!showSearch || !search.trim()) return options;
    return options.filter((opt) => filterOption(opt, search));
  }, [options, search, showSearch, filterOption]);

  if (!open || typeof document === "undefined") return null;

  const handleSelect = (next: string) => {
    onSelect(next);
    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[2050] flex flex-col justify-end bg-slate-900/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mobile-select-sheet-title"
      onClick={onClose}
    >
      <FocusTrap
        active={open}
        focusTrapOptions={{
          allowOutsideClick: true,
          clickOutsideDeactivates: false,
          escapeDeactivates: false,
          returnFocusOnDeactivate: true,
        }}
      >
        <div
          className={
            "flex w-full flex-col overflow-hidden rounded-t-2xl border border-gray-200 bg-white shadow-xl " +
            (menuClassName ?? "")
          }
          style={{
            marginTop: offsetTop,
            height: Math.max(height, 200),
            maxHeight: height,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="shrink-0 border-b border-slate-100 px-4 pb-3 pt-2">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-200" />
            <div className="flex items-center justify-between gap-3">
              <h2
                id="mobile-select-sheet-title"
                className="min-w-0 truncate text-base font-semibold text-slate-900"
              >
                {title}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Закрыть"
              >
                ✕
              </button>
            </div>
            {showSearch ? (
              <div className="mt-3">
                <SelectSearchField
                  value={search}
                  onChange={setSearch}
                  placeholder={searchPlaceholder}
                  variant={variant}
                />
              </div>
            ) : null}
          </div>

          <div
            ref={listRef}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-1"
          >
            <SelectOptionList
              options={visibleOptions}
              value={value}
              onSelect={handleSelect}
              variant={variant}
              listHeader={listHeader}
              emptyHint={
                renderListExtras?.({ search, visibleOptions }) ?? emptyHint
              }
              emptyMessage={emptyMessage}
            />
          </div>
        </div>
      </FocusTrap>
    </div>,
    document.body,
  );
}
