"use client";

import Link from "next/link";

export type ProfileSaveFeedback = {
  successMessage: string;
  subscriptionHint: string | null;
};

type ProfileSaveFeedbackBarProps = {
  feedback: ProfileSaveFeedback;
  onClose: () => void;
};

export function ProfileSaveFeedbackBar({
  feedback,
  onClose,
}: ProfileSaveFeedbackBarProps) {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[1450] border-t border-gray-200 bg-white/95 shadow-lg backdrop-blur"
      role="status"
      aria-live="polite"
    >
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-2 px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-medium text-emerald-900">
              {feedback.successMessage}
            </p>
            {feedback.subscriptionHint ? (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
                {feedback.subscriptionHint}{" "}
                <Link
                  href="/subscription"
                  className="font-semibold underline hover:text-amber-950"
                >
                  Оформить подписку
                </Link>
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-gray-50"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
