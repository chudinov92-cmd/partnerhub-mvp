"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authGetUser } from "@/services/authService";
import { fetchCurrentUserProfileRow } from "@/services/profileService";
import {
  getSubscriptionStatus,
  initRobokassaPayment,
} from "@/services/subscriptionService";
import { isPaidGateMode } from "@/lib/accessMode";
import {
  isPaywallIntent,
  PAYWALL_REASON_PARAM,
} from "@/lib/paywallIntent";
import {
  buildPaymentSuccessPath,
  savePendingPaymentInvId,
  shouldRedirectRobokassaReturnFromSubscription,
} from "@/lib/paymentReturn";
import SubscriptionPageFreemium from "./SubscriptionPageFreemium";

const SUBSCRIPTION_PRICE = "249 ₽";

const PAID_FEATURES = [
  "Просмотр всех профилей на карте без лимита",
  "Ваш пин на карте и видимость в сети",
  "Личные сообщения участникам",
  "Публикация в общем чате города и России",
  "До 50 уникальных собеседников в сутки",
] as const;

function formatExpiresAt(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function IconCheck({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function PaidGateSubscriptionView() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [payLoading, setPayLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const raw = params.get(PAYWALL_REASON_PARAM);
    setReason(isPaywallIntent(raw) ? raw : null);
  }, []);

  const reasonHeadline =
    reason === "dm"
      ? "Напишите участнику — оформите подписку"
      : reason === "chat"
        ? "Пишите в общий чат — оформите подписку"
        : reason === "pin"
          ? "Покажите пин на карте — оформите подписку"
          : "Подписка Zeip";

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const {
        data: { user },
      } = await authGetUser();
      if (!user) {
        setIsAuthenticated(false);
        setProfileId(null);
        setIsSubscribed(false);
        setExpiresAt(null);
        return;
      }

      setIsAuthenticated(true);
      const row = await fetchCurrentUserProfileRow(user.id);
      if (!row?.id) {
        setProfileId(null);
        setError("Профиль не найден. Завершите регистрацию.");
        return;
      }
      setProfileId(row.id);
      const status = await getSubscriptionStatus(row.id);
      setIsSubscribed(status.isPro);
      setExpiresAt(status.expiresAt);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Не удалось загрузить статус подписки",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const search = window.location.search;
    if (shouldRedirectRobokassaReturnFromSubscription("/subscription", search)) {
      router.replace(buildPaymentSuccessPath(search));
    }
  }, [router]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const handleBuy = async () => {
    if (!profileId || isSubscribed) return;
    setPayLoading(true);
    setError(null);
    try {
      const { paymentUrl, invId } = await initRobokassaPayment(profileId);
      savePendingPaymentInvId(String(invId));
      window.location.href = paymentUrl;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка инициации оплаты");
    } finally {
      setPayLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-emerald-50/30 to-emerald-50/30 px-4 py-8 md:py-12">
      <div className="mx-auto max-w-lg">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-slate-900 md:text-3xl">
            {reasonHeadline}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Карту можно смотреть бесплатно. Подписка открывает участие в сети.
          </p>
        </div>

        {loading ? (
          <div className="h-80 animate-pulse rounded-2xl border border-gray-200 bg-white/80" />
        ) : (
          <>
            {isAuthenticated && isSubscribed ? (
              <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 shadow-sm">
                <p className="text-sm font-medium text-emerald-900">
                  Подписка активна
                  {expiresAt
                    ? ` до ${formatExpiresAt(expiresAt)}`
                    : " (без даты окончания)"}
                </p>
              </div>
            ) : null}

            {error ? (
              <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </p>
            ) : null}

            <article className="flex flex-col rounded-2xl border-2 border-emerald-500/40 bg-white p-6 shadow-lg ring-2 ring-emerald-500/10">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-slate-900">
                  Доступ к сети
                </h2>
                <p className="mt-3 text-3xl font-bold text-slate-900">
                  {SUBSCRIPTION_PRICE}
                  <span className="text-sm font-normal text-slate-500">
                    {" "}
                    / 30 дней
                  </span>
                </p>
              </div>
              <ul className="flex-1 space-y-3 text-sm text-slate-700">
                {PAID_FEATURES.map((item) => (
                  <li key={item} className="flex gap-2">
                    <IconCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              {isAuthenticated && isSubscribed ? (
                <div className="mt-6 rounded-xl bg-emerald-50 py-3 text-center text-sm font-medium text-emerald-800">
                  Активна
                </div>
              ) : !isAuthenticated ? (
                <>
                  <Link
                    href="/auth?redirect=/subscription"
                    className="mt-6 block w-full rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 py-3 text-center text-sm font-semibold text-white shadow-sm transition hover:from-emerald-600 hover:to-emerald-700"
                  >
                    Войти и оформить подписку
                  </Link>
                  <p className="mt-1 text-center text-xs text-slate-400">
                    Оплата доступна после входа. Условия — в{" "}
                    <Link href="/terms/oferta" className="underline hover:text-slate-600">
                      публичной оферте
                    </Link>
                  </p>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleBuy}
                    disabled={payLoading || !profileId}
                    className="mt-6 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 py-3 text-sm font-semibold text-white shadow-sm transition hover:from-emerald-600 hover:to-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {payLoading ? "Переход к оплате…" : "Оформить подписку"}
                  </button>
                  <p className="mt-1 text-center text-xs text-slate-400">
                    Оплачивая, вы принимаете условия{" "}
                    <Link href="/terms/oferta" className="underline hover:text-slate-600">
                      публичной оферты
                    </Link>
                  </p>
                </>
              )}
            </article>

            <p className="mt-8 text-center text-xs text-slate-500">
              Оплата через Robokassa. После оплаты доступ активируется автоматически.{" "}
              <Link href="/map" className="text-emerald-700 hover:underline">
                На карту
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default function SubscriptionPage() {
  if (isPaidGateMode()) {
    return <PaidGateSubscriptionView />;
  }
  return <SubscriptionPageFreemium />;
}
