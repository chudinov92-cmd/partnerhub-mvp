"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authGetUser } from "@/services/authService";
import { fetchCurrentUserProfileRow } from "@/services/profileService";
import {
  getSubscriptionStatus,
  initRobokassaPayment,
  initUpgradePayment,
} from "@/services/subscriptionService";
import {
  buildPaymentSuccessPath,
  savePendingPaymentInvId,
  shouldRedirectRobokassaReturnFromSubscription,
} from "@/lib/paymentReturn";
import {
  calculateUpgradePrice,
  FREE_PLAN_FEATURES,
  FREE_PLAN_PIN_FEATURE,
  formatMonthlyEquivalent,
  formatRub,
  getPlanPrice,
  isPaidPlan,
  PIN_COLOR_FREE,
  PIN_COLOR_PRO,
  PIN_COLOR_PRO_PLUS,
  planRank,
  PRO_PLAN_FEATURES,
  PRO_PLAN_PIN_FEATURE,
  PRO_PLUS_PLAN_FEATURES,
  PRO_PLUS_PLAN_PIN_FEATURE,
  SUBSCRIPTION_PRICING,
  upgradeRemainingDays,
  type PaidSubscriptionPlan,
  type SubscriptionPeriod,
  type SubscriptionPlan,
} from "@/lib/subscriptionPlans";
import { isPaidGateMode } from "@/lib/accessMode";
import {
  isPaywallIntent,
  PAYWALL_REASON_PARAM,
} from "@/lib/paywallIntent";

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

function PinFeatureRow({
  label,
  color,
}: {
  label: string;
  color: string;
}) {
  return (
    <li className="flex gap-2">
      <IconCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
      <span className="inline-flex items-center gap-2">
        {label}
        <span
          className="inline-block h-3 w-3 shrink-0 rounded-full ring-1 ring-black/10"
          style={{ backgroundColor: color }}
          aria-hidden
        />
      </span>
    </li>
  );
}

type SubscriptionPlansViewProps = {
  variant?: "freemium" | "paid_gate";
};

export default function SubscriptionPlansView({
  variant = "freemium",
}: SubscriptionPlansViewProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [currentPlan, setCurrentPlan] = useState<SubscriptionPlan>("free");
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [period, setPeriod] = useState<SubscriptionPeriod>("monthly");
  const [payLoadingPlan, setPayLoadingPlan] =
    useState<PaidSubscriptionPlan | null>(null);
  const [upgradeLoading, setUpgradeLoading] = useState(false);
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
      ? "Личные сообщения — оформите подписку"
      : reason === "chat"
        ? "Общий чат — нужен тариф Pro+"
        : reason === "view_limit"
          ? "Лимит просмотров — перейдите на Pro"
          : reason === "favorites_limit"
            ? "Лимит избранного — перейдите на Pro"
            : variant === "paid_gate"
              ? "Подписка Zeip"
              : "Тарифные планы";

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
        setCurrentPlan("free");
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
      setCurrentPlan(status.plan);
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

  const canUpgradeFromPro =
    isAuthenticated &&
    currentPlan === "pro" &&
    Boolean(expiresAt) &&
    upgradeRemainingDays(expiresAt!) > 0;

  const upgradeRemainingDaysCount = expiresAt
    ? upgradeRemainingDays(expiresAt)
    : 0;
  const upgradePrice = canUpgradeFromPro
    ? calculateUpgradePrice(upgradeRemainingDaysCount)
    : null;

  const handleUpgrade = async () => {
    if (!profileId || !canUpgradeFromPro) return;

    setUpgradeLoading(true);
    setError(null);
    try {
      const result = await initUpgradePayment();
      if ("upgraded" in result && result.upgraded) {
        await loadStatus();
        return;
      }
      if ("paymentUrl" in result && result.paymentUrl) {
        savePendingPaymentInvId(String(result.invId));
        window.location.href = result.paymentUrl;
        return;
      }
      throw new Error("Не удалось инициировать апгрейд");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка апгрейда");
      setUpgradeLoading(false);
    }
  };

  const handleBuy = async (plan: PaidSubscriptionPlan) => {
    if (!profileId) return;
    if (
      isPaidPlan(currentPlan) &&
      planRank(currentPlan) >= planRank(plan)
    ) {
      return;
    }

    setPayLoadingPlan(plan);
    setError(null);
    try {
      const { paymentUrl, invId } = await initRobokassaPayment(
        profileId,
        plan,
        period,
      );
      savePendingPaymentInvId(String(invId));
      window.location.href = paymentUrl;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка инициации оплаты");
      setPayLoadingPlan(null);
    }
  };

  const renderPrice = (plan: PaidSubscriptionPlan) => {
    const amount = getPlanPrice(plan, period);
    const monthlyEquivalent = formatMonthlyEquivalent(plan, period);

    return (
      <div>
        <p className="text-3xl font-bold text-slate-900">
          {formatRub(amount)}
          <span className="text-sm font-normal text-slate-500">
            {" "}
            / {period === "monthly" ? "мес" : "год"}
          </span>
        </p>
        {period === "yearly" ? (
          <p className="mt-1 text-xs text-slate-500">
            <span className="line-through">
              {formatRub(SUBSCRIPTION_PRICING[plan].monthly * 12)}
            </span>
            {monthlyEquivalent ? ` · ${monthlyEquivalent}` : null}
          </p>
        ) : null}
      </div>
    );
  };

  const renderProPlusPrice = () => {
    if (canUpgradeFromPro && upgradePrice != null) {
      return (
        <div>
          <p className="text-3xl font-bold text-slate-900">
            {formatRub(upgradePrice)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            за оставшиеся {upgradeRemainingDaysCount}{" "}
            {upgradeRemainingDaysCount === 1
              ? "день"
              : upgradeRemainingDaysCount < 5
                ? "дня"
                : "дней"}{" "}
            Pro
          </p>
          <p className="mt-1 text-xs text-slate-400 line-through">
            {formatRub(getPlanPrice("pro_plus", period))} /{" "}
            {period === "monthly" ? "мес" : "год"}
          </p>
        </div>
      );
    }

    return renderPrice("pro_plus");
  };

  const renderProPlusButton = () => {
    if (currentPlan === "pro_plus") {
      return (
        <div className="mt-6 rounded-xl bg-emerald-50 py-3 text-center text-sm font-medium text-emerald-800">
          Текущий план
          {expiresAt ? ` до ${formatExpiresAt(expiresAt)}` : ""}
        </div>
      );
    }

    if (!isAuthenticated) {
      return (
        <>
          <Link
            href="/auth?redirect=/subscription"
            className="mt-6 block w-full rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 py-3 text-center text-sm font-semibold text-white shadow-sm transition hover:from-teal-600 hover:to-emerald-700"
          >
            Войти и оформить
          </Link>
          <p className="mt-1 text-center text-xs text-slate-400">
            Оплата доступна после входа
          </p>
        </>
      );
    }

    if (canUpgradeFromPro && upgradePrice != null) {
      return (
        <>
          <button
            type="button"
            onClick={() => void handleUpgrade()}
            disabled={upgradeLoading || payLoadingPlan !== null || !profileId}
            className="mt-6 w-full rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 py-3 text-sm font-semibold text-white shadow-sm transition hover:from-teal-600 hover:to-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {upgradeLoading
              ? "Переход к оплате…"
              : `Перейти на Pro+ — ${formatRub(upgradePrice)}`}
          </button>
          <p className="mt-1 text-center text-xs text-slate-400">
            Доплата за оставшиеся {upgradeRemainingDaysCount}{" "}
            {upgradeRemainingDaysCount === 1
              ? "день"
              : upgradeRemainingDaysCount < 5
                ? "дня"
                : "дней"}{" "}
            вашего тарифа Pro
          </p>
        </>
      );
    }

    return renderPlanButton(
      "pro_plus",
      "bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700",
    );
  };

  const renderPlanButton = (
    plan: PaidSubscriptionPlan,
    accentClass: string,
  ) => {
    const isCurrent =
      isPaidPlan(currentPlan) && currentPlan === plan;
    const isLowerThanCurrent =
      isPaidPlan(currentPlan) && planRank(currentPlan) > planRank(plan);

    if (isCurrent) {
      return (
        <div className="mt-6 rounded-xl bg-emerald-50 py-3 text-center text-sm font-medium text-emerald-800">
          Текущий план
          {expiresAt ? ` до ${formatExpiresAt(expiresAt)}` : ""}
        </div>
      );
    }

    if (isLowerThanCurrent) {
      return (
        <p className="mt-6 text-center text-xs text-slate-400">
          У вас активен более высокий тариф
        </p>
      );
    }

    if (!isAuthenticated) {
      return (
        <>
          <Link
            href="/auth?redirect=/subscription"
            className={`mt-6 block w-full rounded-xl py-3 text-center text-sm font-semibold text-white shadow-sm transition ${accentClass}`}
          >
            Войти и оформить
          </Link>
          <p className="mt-1 text-center text-xs text-slate-400">
            Оплата доступна после входа
          </p>
        </>
      );
    }

    return (
      <>
        <button
          type="button"
          onClick={() => void handleBuy(plan)}
          disabled={payLoadingPlan !== null || !profileId}
          className={`mt-6 w-full rounded-xl py-3 text-sm font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${accentClass}`}
        >
          {payLoadingPlan === plan
            ? "Переход к оплате…"
            : currentPlan === "free"
              ? "Оформить"
              : "Перейти на этот тариф"}
        </button>
        <p className="mt-1 text-center text-xs text-slate-400">
          Условия — в{" "}
          <Link href="/terms/oferta" className="underline hover:text-slate-600">
            публичной оферте
          </Link>
        </p>
      </>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-emerald-50/30 to-emerald-50/30 px-4 py-8 md:py-12">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-slate-900 md:text-3xl">
            {reasonHeadline}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {variant === "paid_gate"
              ? "Карту можно смотреть бесплатно. Подписка открывает участие в сети."
              : "Выберите тариф под ваши задачи. Годовая оплата — со скидкой 20%."}
          </p>
        </div>

        <div className="mb-8 flex justify-center">
          <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setPeriod("monthly")}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                period === "monthly"
                  ? "bg-emerald-600 text-white"
                  : "text-slate-600 hover:bg-gray-50"
              }`}
            >
              Месяц
            </button>
            <button
              type="button"
              onClick={() => setPeriod("yearly")}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                period === "yearly"
                  ? "bg-emerald-600 text-white"
                  : "text-slate-600 hover:bg-gray-50"
              }`}
            >
              Год
            </button>
          </div>
        </div>

        {loading ? (
          <div className="grid gap-6 md:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-96 animate-pulse rounded-2xl border border-gray-200 bg-white/80"
              />
            ))}
          </div>
        ) : (
          <>
            {error ? (
              <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </p>
            ) : null}

            <div className="grid gap-6 md:grid-cols-3">
              <article
                className="flex flex-col rounded-2xl border-2 bg-white p-6 shadow-lg ring-2 ring-[#10B981]/30"
                style={{ borderColor: PIN_COLOR_FREE }}
              >
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-slate-900">Free</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Знакомство с сетью
                  </p>
                  <p className="mt-3 text-3xl font-bold text-slate-900">
                    0 ₽
                    <span className="text-sm font-normal text-slate-500">
                      {" "}
                      / мес
                    </span>
                  </p>
                </div>
                <ul className="flex-1 space-y-3 text-sm text-slate-600">
                  {FREE_PLAN_FEATURES.map((item) => (
                    <li key={item} className="flex gap-2">
                      <IconCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                      <span>{item}</span>
                    </li>
                  ))}
                  <PinFeatureRow
                    label={FREE_PLAN_PIN_FEATURE}
                    color={PIN_COLOR_FREE}
                  />
                </ul>
                <p className="mt-6 text-center text-xs text-slate-400">
                  {!isAuthenticated
                    ? "Базовый тариф при регистрации"
                    : currentPlan === "free"
                      ? "Ваш текущий тариф"
                      : "Базовый тариф"}
                </p>
              </article>

              <article
                className="relative flex flex-col rounded-2xl border-2 bg-white p-6 shadow-lg ring-2 ring-[#FDE047]/30"
                style={{ borderColor: PIN_COLOR_PRO }}
              >
                <span
                  className="absolute -top-3 left-4 rounded px-2 py-0.5 text-[10px] font-bold text-slate-900"
                  style={{ backgroundColor: PIN_COLOR_PRO }}
                >
                  PRO
                </span>
                <div className="mb-4 pt-1">
                  <h2 className="text-lg font-semibold text-slate-900">Pro</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    {SUBSCRIPTION_PRICING.pro.tagline}
                  </p>
                  <div className="mt-3">{renderPrice("pro")}</div>
                </div>
                <ul className="flex-1 space-y-3 text-sm text-slate-700">
                  {PRO_PLAN_FEATURES.map((item) => (
                    <li key={item} className="flex gap-2">
                      <IconCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                      <span>{item}</span>
                    </li>
                  ))}
                  <PinFeatureRow
                    label={PRO_PLAN_PIN_FEATURE}
                    color={PIN_COLOR_PRO}
                  />
                </ul>
                {renderPlanButton(
                  "pro",
                  "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700",
                )}
              </article>

              <article
                className="relative flex flex-col rounded-2xl border-2 bg-white p-6 shadow-lg ring-2 ring-[#6466FA]/30"
                style={{ borderColor: PIN_COLOR_PRO_PLUS }}
              >
                <span
                  className="absolute -top-3 left-4 rounded px-2 py-0.5 text-[10px] font-bold text-white"
                  style={{ backgroundColor: PIN_COLOR_PRO_PLUS }}
                >
                  PRO+
                </span>
                <div className="mb-4 pt-1">
                  <h2 className="text-lg font-semibold text-slate-900">Pro+</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    {SUBSCRIPTION_PRICING.pro_plus.tagline}
                  </p>
                  <div className="mt-3">{renderProPlusPrice()}</div>
                </div>
                <ul className="flex-1 space-y-3 text-sm text-slate-700">
                  {PRO_PLUS_PLAN_FEATURES.map((item) => (
                    <li key={item} className="flex gap-2">
                      <IconCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                      <span>{item}</span>
                    </li>
                  ))}
                  <PinFeatureRow
                    label={PRO_PLUS_PLAN_PIN_FEATURE}
                    color={PIN_COLOR_PRO_PLUS}
                  />
                </ul>
                {renderProPlusButton()}
              </article>
            </div>

            <p className="mt-8 text-center text-xs text-slate-500">
              Оплата через Robokassa. После оплаты доступ активируется
              автоматически.{" "}
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
