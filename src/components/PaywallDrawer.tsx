"use client";

import { useState } from "react";
import {
  paywallIntentSubtitle,
  paywallIntentTitle,
  savePendingPaywallContext,
  type PaywallIntentContext,
} from "@/lib/paywallIntent";
import {
  initRobokassaPayment,
  startTrialSubscription,
} from "@/services/subscriptionService";
import {
  trackCheckoutStarted,
  trackPaywallCtaBuy,
  trackTrialStart,
} from "@/lib/paywallAnalytics";
import { recordPaywallDismiss } from "@/lib/paywallFrequency";
import { savePendingPaymentInvId } from "@/lib/paymentReturn";
import { OPEN_SUPPORT_CHAT_EVENT } from "@/lib/support";

const SUBSCRIPTION_PRICE = "249 ₽";

type PaywallDrawerProps = {
  open: boolean;
  onClose: () => void;
  context: PaywallIntentContext;
  profileId: string | null;
  trialUsed: boolean;
  onTrialStarted?: () => void;
};

export function PaywallDrawer({
  open,
  onClose,
  context,
  profileId,
  trialUsed,
  onTrialStarted,
}: PaywallDrawerProps) {
  const [buyLoading, setBuyLoading] = useState(false);
  const [trialLoading, setTrialLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleBuy = async () => {
    if (!profileId) return;
    setBuyLoading(true);
    setError(null);
    trackPaywallCtaBuy(context.intent);
    savePendingPaywallContext(context);
    try {
      trackCheckoutStarted();
      const { paymentUrl, invId } = await initRobokassaPayment(profileId);
      savePendingPaymentInvId(String(invId));
      window.location.href = paymentUrl;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка инициации оплаты");
      setBuyLoading(false);
    }
  };

  const handleTrial = async () => {
    if (!profileId || trialUsed) return;
    setTrialLoading(true);
    setError(null);
    trackTrialStart();
    try {
      await startTrialSubscription();
      onTrialStarted?.();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось активировать пробный период");
    } finally {
      setTrialLoading(false);
    }
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
          {SUBSCRIPTION_PRICE}
          <span className="text-sm font-normal text-slate-500"> / 30 дней</span>
        </p>
        <ul className="mt-4 space-y-2 text-sm text-slate-700">
          <li>· Личные сообщения участникам</li>
          <li>· Публикация в общем чате</li>
          <li>· Ваш пин на карте</li>
        </ul>
        {error ? (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}
        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => void handleBuy()}
            disabled={buyLoading || !profileId}
            className="rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-60"
          >
            {buyLoading ? "Переход к оплате…" : "Оформить подписку"}
          </button>
          {!trialUsed ? (
            <button
              type="button"
              onClick={() => void handleTrial()}
              disabled={trialLoading || !profileId}
              className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800 hover:bg-emerald-100 disabled:opacity-60"
            >
              {trialLoading ? "Активируем…" : "Попробовать 3 дня бесплатно"}
            </button>
          ) : null}
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
    </div>
  );
}
