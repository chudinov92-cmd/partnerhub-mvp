"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { useVisualViewportLayout } from "@/hooks/useMobileKeyboardInset";
import { SelectOptionList } from "./SelectOptionList";
import { SelectSearchField } from "./SelectSearchField";
import {
  defaultFilterOption,
  shouldShowSearch,
  type SelectOverlayCommonProps,
} from "./types";

type MenuPosition = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
};

export function DesktopSelectMenu({
  open,
  onClose,
  anchorRef,
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
}: SelectOverlayCommonProps & {
  anchorRef: RefObject<HTMLElement | null>;
}) {
  const [search, setSearch] = useState("");
  const [searchActive, setSearchActive] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const isTouchRef = useRef(false);
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const { height: vvHeight } = useVisualViewportLayout();
  const showSearch = shouldShowSearch(searchable, options.length);
  const isProfile = variant === "profile";

  useEffect(() => {
    isTouchRef.current =
      "ontouchstart" in window || navigator.maxTouchPoints > 0;
  }, []);

  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const gap = 6;
    const top = rect.bottom + gap;
    const available = Math.max(120, vvHeight - top - 12);
    const maxHeight = Math.min(560, window.innerHeight * 0.4, available);
    setPosition({
      top,
      left: rect.left,
      width: rect.width,
      maxHeight,
    });
  }, [anchorRef, vvHeight]);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
  }, [open, updatePosition, options.length]);

  useEffect(() => {
    if (!open) return;
    const onScrollOrResize = () => updatePosition();
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("scroll", onScrollOrResize, true);
    const vv = window.visualViewport;
    vv?.addEventListener("resize", onScrollOrResize);
    vv?.addEventListener("scroll", onScrollOrResize);
    return () => {
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
      vv?.removeEventListener("resize", onScrollOrResize);
      vv?.removeEventListener("scroll", onScrollOrResize);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) {
      setSearch("");
      setSearchActive(false);
      setPosition(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDocMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (anchorRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      onClose();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose, anchorRef]);

  useEffect(() => {
    if (!open || !showSearch) return;
    if (!isTouchRef.current) {
      setSearchActive(true);
    }
  }, [open, showSearch]);

  useEffect(() => {
    if (!open) return;
    const listEl = listRef.current;
    if (!listEl) return;

    const blurOnTouch = () => {
      const active = document.activeElement;
      if (active instanceof HTMLInputElement) {
        active.blur();
      }
    };

    listEl.addEventListener("touchstart", blurOnTouch, { passive: true });
    return () => listEl.removeEventListener("touchstart", blurOnTouch);
  }, [open]);

  const visibleOptions = useMemo(() => {
    if (!showSearch || !search.trim()) return options;
    return options.filter((opt) => filterOption(opt, search));
  }, [options, search, showSearch, filterOption]);

  if (!open || typeof document === "undefined" || !position) return null;

  const handleSelect = (next: string) => {
    onSelect(next);
    onClose();
  };

  return createPortal(
    <div
      ref={menuRef}
      className={
        "pointer-events-auto fixed z-[2050] rounded-xl border bg-white p-1 shadow-xl " +
        (isProfile ? "border-gray-200" : "border-slate-200") +
        (menuClassName ?? "")
      }
      style={{
        top: position.top,
        left: position.left,
        width: position.width,
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {showSearch ? (
        <div className="px-2 pb-1">
          {isTouchRef.current && !searchActive ? (
            <div
              role="button"
              tabIndex={-1}
              onClick={() => setSearchActive(true)}
              className={
                "flex h-9 w-full items-center rounded-full border px-3 text-sm text-slate-400 " +
                (isProfile ? "border-gray-200" : "border-slate-200")
              }
            >
              {searchPlaceholder}
            </div>
          ) : (
            <SelectSearchField
              value={search}
              onChange={setSearch}
              placeholder={searchPlaceholder}
              variant={variant}
              autoFocusOnDesktop
            />
          )}
        </div>
      ) : null}

      <div
        ref={listRef}
        className="overflow-y-auto overscroll-contain"
        style={{ maxHeight: position.maxHeight }}
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
          compact
        />
      </div>
    </div>,
    document.body,
  );
}
