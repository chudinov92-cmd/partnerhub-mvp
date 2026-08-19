"use client";

import Link from "next/link";
import FocusTrap from "focus-trap-react";
import {
  paywallIntentSubtitle,
  paywallIntentTitle,
  savePendingPaywallContext,
  type PaywallIntentContext,
} from "@/lib/paywallIntent";
import { formatRub, SUBSCRIPTION_PRICING } from "@/lib/subscriptionPlans";
import {
  trackCheckoutStarted,
  trackPaywallCtaBuy,
} from "@/lib/paywallAnalytics";
import { recordPaywallDismiss } from "@/lib/paywallFrequency";
import { OPEN_SUPPORT_CHAT_EVENT } from "@/lib/support";

type PaywallDrawerProps = {
  open: boolean;
  onClose: () => void;
  context: PaywallIntentContext;
};

export function PaywallDrawer({
  open,
  onClose,
  context,
}: PaywallDrawerProps) {
  if (!open) return null;

  const subscriptionHref = `/subscription?reason=${encodeURIComponent(context.intent)}`;
  const needsProPlus = context.intent === "chat";
  const ctaPrice = needsProPlus
    ? formatRub(SUBSCRIPTION_PRICING.pro_plus.monthly)
    : formatRub(SUBSCRIPTION_PRICING.pro.monthly);
  const ctaPlan = needsProPlus ? "Pro+" : "Pro";

  const handleChoosePlan = () => {
    trackPaywallCtaBuy(context.intent);
    trackCheckoutStarted();
    savePendingPaywallContext(context);
    window.location.href = subscriptionHref;
  };

  const handleDismiss = () => {
    recordPaywallDismiss(context.intent);
    onClose();
  };

  const handleSupport = () => {
    onClose();
    window.dispatchEvent(new CustomEvent(OPEN_SUPPORT_CHAT_EVENT));
  };

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="paywall-drawer-title"
      onClick={handleDismiss}
    >
      <FocusTrap
        active={open}
        focusTrapOptions={{
          returnFocusOnDeactivate: true,
          escapeDeactivates: true,
          onDeactivate: handleDismiss,
        }}
      >
        <div
          className="w-full max-w-md rounded-t-2xl border border-emerald-100 bg-white p-6 shadow-xl sm:rounded-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <h2
            id="paywall-drawer-title"
            className="text-lg font-semibold text-slate-900"
          >
            {paywallIntentTitle(context)}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {paywallIntentSubtitle(context)}
          </p>
          <p className="mt-4 text-2xl font-bold text-slate-900">
            {needsProPlus ? (
              <>
                {ctaPrice}
                <span className="text-sm font-normal text-slate-500"> / мес</span>
              </>
            ) : (
              <>
                от {formatRub(SUBSCRIPTION_PRICING.pro.monthly)}
                <span className="text-sm font-normal text-slate-500"> / мес</span>
              </>
            )}
          </p>
          <ul className="mt-4 space-y-2 text-sm text-slate-700">
            {needsProPlus ? (
              <>
                <li>· Общий чат — до 10 сообщений в сутки</li>
                <li>· Личные сообщения — до 30 человек в сутки</li>
              </>
            ) : (
              <>
                <li>· Профили и избранное без лимита</li>
                <li>· Личные сообщения — до 10 человек в сутки</li>
              </>
            )}
          </ul>
          <p className="mt-3 text-xs leading-relaxed text-slate-400">
            {`Тариф ${ctaPlan} · без автопродления · `}
            <Link
              href="/terms/oferta"
              target="_blank"
              className="underline hover:text-slate-600"
            >
              Условия
            </Link>
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <button
              type="button"
              onClick={handleChoosePlan}
              className="rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:from-emerald-600 hover:to-emerald-700"
            >
              Выбрать тариф
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-gray-50"
            >
              Не сейчас
            </button>
            <button
              type="button"
              onClick={handleSupport}
              className="text-sm font-medium text-slate-500 hover:text-slate-700"
            >
              Написать в поддержку
            </button>
          </div>
        </div>
      </FocusTrap>
    </div>
  );
}
