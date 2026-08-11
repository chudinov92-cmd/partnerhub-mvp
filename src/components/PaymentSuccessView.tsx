"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { authGetUser } from "@/services/authService";
import { fetchCurrentUserProfileRow } from "@/services/profileService";
import { getSubscriptionStatus } from "@/services/subscriptionService";
import { fetchPaymentStatusByInvId } from "@/services/paymentStatusService";
import {
  buildPaymentSuccessLoginRedirect,
  clearPendingPaymentInvId,
  resolvePaymentInvId,
} from "@/lib/paymentReturn";
import {
  trackPaymentSuccessActivated,
  trackPaymentSuccessNeedLogin,
  trackPaymentSuccessOpen,
  trackPaymentSuccessTimeout,
} from "@/lib/paymentAnalytics";

const POLL_INTERVAL_MS = 2000;
const POLL_MAX_ATTEMPTS = 15;
const AUTH_RETRY_MS = 500;
const AUTH_RETRY_COUNT = 3;

type ViewState =
  | "loading"
  | "need_login"
  | "activating"
  | "success"
  | "pending";

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

type PaymentSuccessViewProps = {
  /** После успеха: `/map` (freemium) или `/map?payment=success` (paid_gate) */
  successRedirectPath: string;
  subscriptionLabel?: string;
};

async function authGetUserWithRetry() {
  for (let i = 0; i < AUTH_RETRY_COUNT; i += 1) {
    const result = await authGetUser();
    if (result.data.user) return result;
    if (i < AUTH_RETRY_COUNT - 1) {
      await new Promise((r) => setTimeout(r, AUTH_RETRY_MS));
    }
  }
  return authGetUser();
}

export function PaymentSuccessView({
  successRedirectPath,
  subscriptionLabel = "Pro",
}: PaymentSuccessViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const invId = resolvePaymentInvId(search ? `?${search}` : "");
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollAttemptRef = useRef(0);
  const openedTrackedRef = useRef(false);

  const [viewState, setViewState] = useState<ViewState>("loading");
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [loginHref, setLoginHref] = useState("/auth");

  const finishSuccess = useCallback(
    (expires: string | null) => {
      clearPendingPaymentInvId();
      setExpiresAt(expires);
      setViewState("success");
      trackPaymentSuccessActivated();
    },
    [],
  );

  const pollActivation = useCallback(
    async (profileId: string, paymentInvId: string | null) => {
      pollAttemptRef.current += 1;

      try {
        if (paymentInvId) {
          const paymentStatus = await fetchPaymentStatusByInvId(paymentInvId);
          if (paymentStatus.isPro || paymentStatus.status === "paid") {
            finishSuccess(paymentStatus.proExpiresAt);
            return;
          }
        }
      } catch {
        // fallback to profile status
      }

      try {
        const status = await getSubscriptionStatus(profileId);
        if (status.isPro) {
          finishSuccess(status.expiresAt);
          return;
        }
      } catch {
        //
      }

      if (pollAttemptRef.current >= POLL_MAX_ATTEMPTS) {
        setViewState("pending");
        trackPaymentSuccessTimeout();
        return;
      }

      pollTimerRef.current = setTimeout(() => {
        void pollActivation(profileId, paymentInvId);
      }, POLL_INTERVAL_MS);
    },
    [finishSuccess],
  );

  useEffect(() => {
    if (!openedTrackedRef.current) {
      openedTrackedRef.current = true;
      trackPaymentSuccessOpen();
    }

    let cancelled = false;

    const run = async () => {
      const {
        data: { user },
      } = await authGetUserWithRetry();

      if (cancelled) return;

      if (!user) {
        const idForLogin = invId ?? "";
        setLoginHref(
          idForLogin
            ? buildPaymentSuccessLoginRedirect(idForLogin)
            : "/auth?redirect=/payment/success",
        );
        setViewState("need_login");
        trackPaymentSuccessNeedLogin();
        return;
      }

      const row = await fetchCurrentUserProfileRow(user.id);
      if (!row?.id) {
        setViewState("need_login");
        trackPaymentSuccessNeedLogin();
        return;
      }

      const status = await getSubscriptionStatus(row.id);
      if (status.isPro) {
        finishSuccess(status.expiresAt);
        return;
      }

      setViewState("activating");
      pollAttemptRef.current = 0;
      void pollActivation(row.id, invId);
    };

    void run();

    return () => {
      cancelled = true;
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current);
      }
    };
  }, [invId, finishSuccess, pollActivation]);

  const handleContinue = () => {
    router.push(successRedirectPath);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 via-emerald-50/30 to-emerald-50/30 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-emerald-100 bg-white p-8 shadow-lg">
        {viewState === "loading" || viewState === "activating" ? (
          <>
            <div
              className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-600"
              aria-hidden
            />
            <h1 className="mt-6 text-center text-xl font-semibold text-slate-900">
              {viewState === "loading"
                ? "Проверяем оплату…"
                : "Активируем подписку…"}
            </h1>
            <p className="mt-2 text-center text-sm text-slate-600">
              Обычно это занимает несколько секунд.
            </p>
          </>
        ) : null}

        {viewState === "need_login" ? (
          <>
            <h1 className="text-xl font-semibold text-slate-900">
              Оплата получена
            </h1>
            <p className="mt-3 text-sm text-slate-600">
              Войдите в тот же аккаунт, с которого оформляли подписку — мы
              активируем доступ автоматически.
            </p>
            <Link
              href={loginHref}
              className="mt-6 block w-full rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 py-3 text-center text-sm font-semibold text-white shadow-sm hover:from-emerald-600 hover:to-emerald-700"
            >
              Войти
            </Link>
            <Link
              href="/map"
              className="mt-3 block text-center text-sm font-medium text-slate-500 hover:text-slate-700"
            >
              На карту
            </Link>
          </>
        ) : null}

        {viewState === "success" ? (
          <>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              ✓
            </div>
            <h1 className="mt-4 text-center text-xl font-semibold text-slate-900">
              Подписка {subscriptionLabel} активна
            </h1>
            {expiresAt ? (
              <p className="mt-2 text-center text-sm text-slate-600">
                Действует до {formatExpiresAt(expiresAt)}
              </p>
            ) : null}
            <button
              type="button"
              onClick={handleContinue}
              className="mt-6 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 py-3 text-sm font-semibold text-white shadow-sm hover:from-emerald-600 hover:to-emerald-700"
            >
              Продолжить
            </button>
          </>
        ) : null}

        {viewState === "pending" ? (
          <>
            <h1 className="text-xl font-semibold text-slate-900">
              Оплата принята
            </h1>
            <p className="mt-3 text-sm text-slate-600">
              Активация подписки может занять до 15 минут. Если доступ не
              появится — напишите в поддержку с номером платежа
              {invId ? ` (${invId})` : ""}.
            </p>
            <button
              type="button"
              onClick={() => router.push("/map")}
              className="mt-6 w-full rounded-xl border border-gray-200 py-3 text-sm font-semibold text-slate-800 hover:bg-gray-50"
            >
              На карту
            </button>
            <Link
              href="/settings"
              className="mt-3 block text-center text-sm font-medium text-emerald-700 hover:underline"
            >
              Настройки
            </Link>
          </>
        ) : null}
      </div>
    </div>
  );
}
