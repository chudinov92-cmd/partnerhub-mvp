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

const PRO_PRICE = "249 ₽";
const PRO_ACCENT = "#FDE047";

const FREE_FEATURES = [
  "Стандартный пин на карте (базовый цвет)",
  "Обычное ранжирование в поиске и на карте (после Pro-пользователей)",
  "Общий чат города: только чтение",
  "Общероссийский чат: только чтение",
  "Рекламные блоки отображаются",
  "До 5 уникальных собеседников в сутки в личных сообщениях",
] as const;

const PRO_FEATURES = [
  {
    text: "Выделение пина на карте",
    badgeLabel: "цветом",
    badgeColor: PRO_ACCENT,
  },
  "Приоритет в поиске и на карте (выше Free, внутри Pro — по рейтингу)",
  "Общий чат города: можно писать",
  "Общероссийский чат: можно писать",
  "Реклама полностью скрыта",
  "До 50 уникальных собеседников в сутки в личных сообщениях",
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

function IconX({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export default function SubscriptionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [isPro, setIsPro] = useState(false);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [payLoading, setPayLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const {
        data: { user },
      } = await authGetUser();
      if (!user) {
        router.replace("/auth");
        return;
      }
      const row = await fetchCurrentUserProfileRow(user.id);
      if (!row?.id) {
        setError("Профиль не найден. Завершите регистрацию.");
        return;
      }
      setProfileId(row.id);
      const status = await getSubscriptionStatus(row.id);
      setIsPro(status.isPro);
      setExpiresAt(status.expiresAt);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Не удалось загрузить статус подписки",
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const handleBuy = async () => {
    if (!profileId || isPro) return;
    setPayLoading(true);
    setError(null);
    try {
      const { paymentUrl } = await initRobokassaPayment(profileId);
      window.location.href = paymentUrl;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка инициации оплаты");
    } finally {
      setPayLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-emerald-50/30 to-emerald-50/30 px-4 py-8 md:py-12">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-slate-900 md:text-3xl">
            Тарифные планы
          </h1>
        </div>

        {loading ? (
          <div className="grid gap-6 md:grid-cols-2">
            {[0, 1].map((i) => (
              <div
                key={i}
                className="h-80 animate-pulse rounded-2xl border border-gray-200 bg-white/80"
              />
            ))}
          </div>
        ) : (
          <>
            {isPro ? (
              <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 shadow-sm">
                <p className="text-sm font-medium text-emerald-900">
                  Подписка Pro активна
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

            <div className="grid gap-6 md:grid-cols-2">
              {/* FREE */}
              <article className="flex flex-col rounded-2xl border border-gray-200 bg-white p-6 shadow-lg">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-slate-900">Free</h2>
                  <p className="mt-1 text-xs text-slate-500">Текущий план</p>
                  <p className="mt-3 text-3xl font-bold text-slate-900">
                    0 ₽
                    <span className="text-sm font-normal text-slate-500">
                      {" "}
                      / мес
                    </span>
                  </p>
                </div>
                <ul className="flex-1 space-y-3 text-sm text-slate-600">
                  {FREE_FEATURES.map((item) => (
                    <li key={item} className="flex gap-2">
                      <IconX className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-6 text-center text-xs text-slate-400">
                  {isPro ? "Базовый план" : "Ваш текущий тариф"}
                </p>
              </article>

              {/* PRO */}
              <article
                className="relative flex flex-col rounded-2xl border-2 bg-white p-6 shadow-lg ring-2 ring-[#FDE047]/30"
                style={{ borderColor: PRO_ACCENT }}
              >
                <span
                  className="absolute -top-3 left-4 rounded px-2 py-0.5 text-[10px] font-bold text-slate-900"
                  style={{ backgroundColor: PRO_ACCENT }}
                >
                  PRO
                </span>
                <div className="mb-4 pt-1">
                  <h2 className="text-lg font-semibold text-slate-900">Pro</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Максимальная видимость
                  </p>
                  <p className="mt-3 text-3xl font-bold text-slate-900">
                    {PRO_PRICE}
                    <span className="text-sm font-normal text-slate-500">
                      {" "}
                      / мес
                    </span>
                  </p>
                </div>
                <ul className="flex-1 space-y-3 text-sm text-slate-700">
                  {PRO_FEATURES.map((item) => {
                    const text = typeof item === "string" ? item : item.text;
                    const badgeLabel =
                      typeof item === "string" ? null : item.badgeLabel;
                    const badgeColor =
                      typeof item === "string" ? null : item.badgeColor;
                    return (
                      <li key={text} className="flex gap-2">
                        <IconCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                        <span>
                          {badgeLabel && badgeColor ? (
                            <>
                              {text}{" "}
                              <span
                                className="inline-block rounded px-1.5 py-0.5 text-xs font-semibold text-slate-900"
                                style={{ backgroundColor: badgeColor }}
                              >
                                {badgeLabel}
                              </span>
                            </>
                          ) : (
                            text
                          )}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                {isPro ? (
                  <div className="mt-6 rounded-xl bg-emerald-50 py-3 text-center text-sm font-medium text-emerald-800">
                    Активен
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handleBuy}
                      disabled={payLoading || !profileId}
                      className="mt-6 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 py-3 text-sm font-semibold text-white shadow-sm transition hover:from-emerald-600 hover:to-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {payLoading ? "Переход к оплате…" : "Купить Pro"}
                    </button>
                    <p className="mt-1 text-center text-xs text-slate-400">
                      Оплачивая, вы принимаете условия{" "}
                      <Link
                        href="/terms/oferta"
                        className="underline hover:text-slate-600"
                      >
                        публичной оферты
                      </Link>
                    </p>
                  </>
                )}
              </article>
            </div>

            <p className="mt-8 text-center text-xs text-slate-500">
              Оплата через Robokassa. После подключения webhook подписка
              активируется автоматически.{" "}
              <Link href="/" className="text-emerald-700 hover:underline">
                На главную
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
