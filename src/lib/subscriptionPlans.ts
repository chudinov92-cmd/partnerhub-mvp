export type SubscriptionPlan = "free" | "pro" | "pro_plus";
export type PaidSubscriptionPlan = "pro" | "pro_plus";
export type SubscriptionPeriod = "monthly" | "yearly";
export type PaymentPlanId =
  | "pro_monthly"
  | "pro_yearly"
  | "pro_plus_monthly"
  | "pro_plus_yearly";

export const FREE_DM_LIMIT = 0;
export const PRO_DM_LIMIT = 10;
export const PRO_PLUS_DM_LIMIT = 30;
export const FREE_FAVORITES_LIMIT = 5;
export const FREE_PROFILE_VIEWS_LIMIT = 5;
export const PRO_PLUS_CHAT_LIMIT = 10;

export const PIN_COLOR_FREE = "#10B981";
export const PIN_COLOR_PRO = "#FDE047";
export const PIN_COLOR_PRO_PLUS = "#6466FA";

export function getPinColorForPlan(plan: SubscriptionPlan): string {
  switch (plan) {
    case "pro_plus":
      return PIN_COLOR_PRO_PLUS;
    case "pro":
      return PIN_COLOR_PRO;
    default:
      return PIN_COLOR_FREE;
  }
}

export const SUBSCRIPTION_PRICING: Record<
  PaidSubscriptionPlan,
  { monthly: number; yearly: number; label: string; tagline: string }
> = {
  pro: {
    monthly: 249,
    yearly: 2390,
    label: "Pro",
    tagline: "Активный нетворкинг",
  },
  pro_plus: {
    monthly: 449,
    yearly: 4310,
    label: "Pro+",
    tagline: "Максимальный охват",
  },
};

export const YEARLY_DISCOUNT_PERCENT = 20;

export const UPGRADE_PLAN_ID = "upgrade_pro_to_pro_plus";

export function upgradeRemainingDays(proExpiresAt: string): number {
  const ms = new Date(proExpiresAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export function calculateUpgradePrice(remainingDays: number): number {
  const diffPerDay =
    (SUBSCRIPTION_PRICING.pro_plus.monthly - SUBSCRIPTION_PRICING.pro.monthly) /
    30;
  const raw = diffPerDay * remainingDays;
  return Math.max(1, Math.round(raw * 100) / 100);
}

export function formatUpgradeOutSum(amount: number): string {
  return amount.toFixed(2);
}

export function buildUpgradeDescription(remainingDays: number): string {
  return `Апгрейд до Zeip Pro+ (${remainingDays} дн.)`;
}

export function isUpgradePaymentPlan(planId: string): boolean {
  return planId === UPGRADE_PLAN_ID;
}

export function buildPaymentPlanId(
  plan: PaidSubscriptionPlan,
  period: SubscriptionPeriod,
): PaymentPlanId {
  return `${plan}_${period}` as PaymentPlanId;
}

export function parsePaymentPlanId(planId: string): {
  subscriptionPlan: PaidSubscriptionPlan;
  period: SubscriptionPeriod;
  days: number;
  outSum: string;
  description: string;
} | null {
  const map: Record<
    PaymentPlanId,
    {
      subscriptionPlan: PaidSubscriptionPlan;
      period: SubscriptionPeriod;
      days: number;
      outSum: string;
      description: string;
    }
  > = {
    pro_monthly: {
      subscriptionPlan: "pro",
      period: "monthly",
      days: 30,
      outSum: "249.00",
      description: "Подписка Zeip Pro на 1 месяц",
    },
    pro_yearly: {
      subscriptionPlan: "pro",
      period: "yearly",
      days: 365,
      outSum: "2390.00",
      description: "Подписка Zeip Pro на 1 год",
    },
    pro_plus_monthly: {
      subscriptionPlan: "pro_plus",
      period: "monthly",
      days: 30,
      outSum: "449.00",
      description: "Подписка Zeip Pro+ на 1 месяц",
    },
    pro_plus_yearly: {
      subscriptionPlan: "pro_plus",
      period: "yearly",
      days: 365,
      outSum: "4310.00",
      description: "Подписка Zeip Pro+ на 1 год",
    },
  };

  if (planId in map) {
    return map[planId as PaymentPlanId];
  }

  // Legacy: pro_monthly до введения тарифов
  if (planId === "pro_monthly" || planId === "pro") {
    return map.pro_monthly;
  }

  return null;
}

export function getPlanPrice(
  plan: PaidSubscriptionPlan,
  period: SubscriptionPeriod,
): number {
  return SUBSCRIPTION_PRICING[plan][period];
}

export function formatRub(amount: number): string {
  return `${amount.toLocaleString("ru-RU")} ₽`;
}

export function formatMonthlyEquivalent(
  plan: PaidSubscriptionPlan,
  period: SubscriptionPeriod,
): string | null {
  if (period !== "yearly") return null;
  const yearly = SUBSCRIPTION_PRICING[plan].yearly;
  const monthly = Math.round(yearly / 12);
  return `~${formatRub(monthly)}/мес`;
}

export function isPaidPlan(plan: SubscriptionPlan): plan is PaidSubscriptionPlan {
  return plan === "pro" || plan === "pro_plus";
}

export function planRank(plan: SubscriptionPlan): number {
  switch (plan) {
    case "pro_plus":
      return 2;
    case "pro":
      return 1;
    default:
      return 0;
  }
}

export const FREE_PLAN_FEATURES = [
  "До 5 профилей в день",
  "До 5 контактов в избранном",
  "Чтение общего чата",
] as const;

export const PRO_PLAN_FEATURES = [
  "Профили без ограничений",
  "Избранное без ограничений",
  "Чтение общего чата",
  "Личные сообщения — до 10 человек в сутки",
] as const;

export const PRO_PLUS_PLAN_FEATURES = [
  "Профили без ограничений",
  "Избранное без ограничений",
  "Общий чат — до 10 сообщений в сутки",
  "Личные сообщения — до 30 человек в сутки",
] as const;

export const FREE_PLAN_PIN_FEATURE = "Пин зелёного цвета";
export const PRO_PLAN_PIN_FEATURE = "Пин жёлтого цвета";
export const PRO_PLUS_PLAN_PIN_FEATURE = "Пин фиолетового цвета";
