"use client";

import { useEffect, useRef } from "react";

type PaymentSuccessToastProps = {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss: () => void;
  durationMs?: number;
  showCloseButton?: boolean;
};

export function PaymentSuccessToast({
  message,
  actionLabel,
  onAction,
  onDismiss,
  durationMs = 8000,
  showCloseButton = true,
}: PaymentSuccessToastProps) {
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    const t = window.setTimeout(() => onDismissRef.current(), durationMs);
    return () => window.clearTimeout(t);
  }, [message, durationMs]);

  const hasAction = Boolean(actionLabel && onAction);
  const hasButtons = hasAction || showCloseButton;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-[2100] mx-auto max-w-md rounded-2xl border border-emerald-200 bg-white p-4 shadow-xl sm:bottom-6">
      <p className="text-sm font-medium text-emerald-900">{message}</p>
      {hasButtons ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {hasAction ? (
            <button
              type="button"
              onClick={onAction}
              className="rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 px-3 py-1.5 text-xs font-semibold text-white"
            >
              {actionLabel}
            </button>
          ) : null}
          {showCloseButton ? (
            <button
              type="button"
              onClick={onDismiss}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-slate-600"
            >
              Закрыть
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
