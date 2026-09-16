"use client";

import { useEffect } from "react";
import FocusTrap from "focus-trap-react";

type ProfessionDidYouMeanModalProps = {
  open: boolean;
  input: string;
  suggestion: string;
  onConfirm: () => void;
  onReject: () => void;
};

export function ProfessionDidYouMeanModal({
  open,
  input,
  suggestion,
  onConfirm,
  onReject,
}: ProfessionDidYouMeanModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onReject();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onReject]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[2100] flex items-center justify-center bg-slate-900/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profession-did-you-mean-title"
      onClick={onReject}
    >
      <FocusTrap
        active={open}
        focusTrapOptions={{
          initialFocus: "#profession-did-you-mean-title",
          fallbackFocus: "#profession-did-you-mean-title",
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
            id="profession-did-you-mean-title"
            tabIndex={-1}
            className="text-lg font-semibold text-slate-900 outline-none"
          >
            Вы имели в виду «{suggestion}»?
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Вы ввели «{input}». Если это опечатка, выберите профессию из каталога — так
            мы не создадим дубликат.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <button
              type="button"
              onClick={onConfirm}
              className="rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:from-emerald-600 hover:to-emerald-700"
            >
              Да, «{suggestion}»
            </button>
            <button
              type="button"
              onClick={onReject}
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-gray-50"
            >
              Нет, добавить «{input}»
            </button>
          </div>
        </div>
      </FocusTrap>
    </div>
  );
}
