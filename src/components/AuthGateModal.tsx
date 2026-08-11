"use client";

import Link from "next/link";
import FocusTrap from "focus-trap-react";
import { GUEST_PROFILE_VIEW_LIMIT } from "@/lib/guestProfileViews";
import { buildAuthRedirectForMapWrite } from "@/lib/paywallIntent";

export type AuthGateReason = "view_limit" | "write";

type AuthGateModalProps = {
  open: boolean;
  onClose: () => void;
  reason: AuthGateReason;
  profileId?: string;
  profileName?: string | null;
};

export function AuthGateModal({
  open,
  onClose,
  reason,
  profileId,
  profileName,
}: AuthGateModalProps) {
  if (!open) return null;

  const authHref =
    reason === "write" && profileId
      ? buildAuthRedirectForMapWrite(profileId)
      : "/auth?redirect=/map";

  const title =
    reason === "write" && profileName
      ? `Войдите, чтобы написать ${profileName}`
      : "Войдите, чтобы смотреть дальше";

  const description =
    reason === "write"
      ? "После входа вы сможете писать участникам и участвовать в сети."
      : `Гостям доступно ${GUEST_PROFILE_VIEW_LIMIT} профилей. Войдите или зарегистрируйтесь, чтобы смотреть всех участников и писать им.`;

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-gate-title"
      onClick={onClose}
    >
      <FocusTrap
        active={open}
        focusTrapOptions={{
          returnFocusOnDeactivate: true,
          escapeDeactivates: true,
          onDeactivate: onClose,
        }}
      >
        <div
          className="w-full max-w-md rounded-t-2xl border border-emerald-100 bg-white p-6 shadow-xl sm:rounded-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <h2
            id="auth-gate-title"
            className="text-lg font-semibold text-slate-900"
          >
            {title}
          </h2>
          <p className="mt-3 text-sm text-slate-600">{description}</p>
          <div className="mt-6 flex flex-col gap-2">
            <Link
              href={authHref}
              className="rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-2.5 text-center text-sm font-semibold text-white shadow-sm hover:from-emerald-600 hover:to-emerald-700"
            >
              Войти
            </Link>
            <Link
              href={`${authHref}${authHref.includes("?") ? "&" : "?"}mode=signup`}
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-center text-sm font-medium text-slate-700 hover:bg-gray-50"
            >
              Создать аккаунт
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-700"
            >
              Продолжить смотреть карту
            </button>
          </div>
        </div>
      </FocusTrap>
    </div>
  );
}
