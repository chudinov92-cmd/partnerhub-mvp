"use client";

import Link from "next/link";
import { isPaidGateMode } from "@/lib/accessMode";
import { GUEST_PROFILE_VIEW_LIMIT } from "@/lib/guestProfileViews";

type GuestSubscribeModalProps = {
  open: boolean;
  onClose: () => void;
};

export function GuestSubscribeModal({ open, onClose }: GuestSubscribeModalProps) {
  if (!open) return null;

  const paidGate = isPaidGateMode();
  const description = paidGate
    ? `Гостям доступно ${GUEST_PROFILE_VIEW_LIMIT} профилей. Войдите и оформите участие за 249 ₽ / 30 дней.`
    : `Гостям доступно ${GUEST_PROFILE_VIEW_LIMIT} профилей. Войдите бесплатно — и смотрите всех участников.`;
  const ctaHref = paidGate ? "/auth?redirect=/subscription" : "/auth?redirect=/map";
  const ctaLabel = paidGate ? "Войти и оформить участие" : "Войти бесплатно";

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="guest-subscribe-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-emerald-100 bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="guest-subscribe-title"
          className="text-lg font-semibold text-slate-900"
        >
          Хотите увидеть больше участников?
        </h2>
        <p className="mt-3 text-sm text-slate-600">{description}</p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-gray-50"
          >
            Продолжить смотреть карту
          </button>
          <Link
            href={ctaHref}
            className="rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-2.5 text-center text-sm font-semibold text-white shadow-sm hover:from-emerald-600 hover:to-emerald-700"
          >
            {ctaLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}
