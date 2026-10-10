"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import FocusTrap from "focus-trap-react";

type PinLimitModalProps = {
  open: boolean;
  onClose: () => void;
};

export function PinLimitModal({ open, onClose }: PinLimitModalProps) {
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[2100] flex items-center justify-center bg-slate-900/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pin-limit-title"
      onClick={onClose}
    >
      <FocusTrap
        active={open}
        focusTrapOptions={{
          initialFocus: "#pin-limit-title",
          fallbackFocus: "#pin-limit-title",
          allowOutsideClick: true,
          clickOutsideDeactivates: false,
          escapeDeactivates: false,
          returnFocusOnDeactivate: true,
        }}
      >
        <div
          className="w-full max-w-sm rounded-2xl border border-emerald-100 bg-white p-6 shadow-xl"
          tabIndex={-1}
          onClick={(e) => e.stopPropagation()}
        >
          <h2
            id="pin-limit-title"
            tabIndex={-1}
            className="text-lg font-semibold text-slate-900 outline-none"
          >
            Лимит просмотров на сегодня
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Вы просмотрели 5 профилей сегодня. Оформите подписку, чтобы
            пользоваться Zeip без ограничений.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => router.push("/subscription")}
              className="rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:from-emerald-600 hover:to-emerald-700"
            >
              Оформить подписку
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-gray-50"
            >
              Закрыть
            </button>
          </div>
        </div>
      </FocusTrap>
    </div>
  );
}
