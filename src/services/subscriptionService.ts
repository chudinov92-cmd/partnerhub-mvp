"use client";

import { supabase } from "@/lib/supabaseClient";
import { isPaidGateMode } from "@/lib/accessMode";
import {
  FREE_DM_LIMIT,
  FREE_FAVORITES_LIMIT,
  FREE_PROFILE_VIEWS_LIMIT,
  PRO_DM_LIMIT,
  PRO_PLUS_CHAT_LIMIT,
  PRO_PLUS_DM_LIMIT,
  type PaidSubscriptionPlan,
  type SubscriptionPeriod,
  type SubscriptionPlan,
} from "@/lib/subscriptionPlans";

export type { SubscriptionPlan, PaidSubscriptionPlan, SubscriptionPeriod };

export type SubscriptionStatus = {
  isPro: boolean;
  plan: SubscriptionPlan;
  expiresAt: string | null;
  trialUsed: boolean;
};

export type ProProfileFields = {
  is_pro?: boolean | null;
  pro_expires_at?: string | null;
  trial_used?: boolean | null;
  subscription_plan?: SubscriptionPlan | null;
};

export { PIN_COLOR_PRO as PRO_PIN_COLOR } from "@/lib/subscriptionPlans";

export {
  FREE_DM_LIMIT,
  FREE_FAVORITES_LIMIT,
  FREE_PROFILE_VIEWS_LIMIT,
  PRO_DM_LIMIT,
  PRO_PLUS_DM_LIMIT,
  PRO_PLUS_CHAT_LIMIT,
};

/** Активная подписка Pro/Pro+: флаг и (пустая дата или дата в будущем). */
export function isActiveProProfile(
  row: ProProfileFields | null | undefined,
): boolean {
  if (!row) return false;
  const expiresAt = row.pro_expires_at ?? null;
  const isProFlag = Boolean(row.is_pro);
  const notExpired =
    !expiresAt || new Date(expiresAt).getTime() > Date.now();
  return isProFlag && notExpired;
}

/** Алиас для UI (профиль в ленте / на карте). */
export const isProActive = isActiveProProfile;

export function getEffectiveSubscriptionPlan(
  row: ProProfileFields | null | undefined,
): SubscriptionPlan {
  if (!isActiveProProfile(row)) return "free";
  const plan = row?.subscription_plan;
  if (plan === "pro" || plan === "pro_plus") return plan;
  return "pro";
}

export function getDmPartnersDailyLimit(plan: SubscriptionPlan): number {
  if (isPaidGateMode()) {
    switch (plan) {
      case "pro_plus":
        return PRO_PLUS_DM_LIMIT;
      case "pro":
        return PRO_DM_LIMIT;
      default:
        return FREE_DM_LIMIT;
    }
  }

  switch (plan) {
    case "pro_plus":
      return PRO_PLUS_DM_LIMIT;
    case "pro":
      return PRO_DM_LIMIT;
    default:
      return FREE_DM_LIMIT;
  }
}

export function canWriteGeneralChat(
  plan: SubscriptionPlan,
  isBlocked: boolean,
): boolean {
  if (isBlocked) return false;
  return plan === "pro_plus";
}

export function canSendDirectMessages(plan: SubscriptionPlan): boolean {
  return getDmPartnersDailyLimit(plan) > 0;
}

export async function getSubscriptionStatus(
  profileId: string,
): Promise<SubscriptionStatus> {
  const { data, error } = await supabase
    .from("profiles")
    .select("is_pro, pro_expires_at, trial_used, subscription_plan")
    .eq("id", profileId)
    .maybeSingle();

  if (error) throw error;

  const row = data as ProProfileFields | null;
  const expiresAt = row?.pro_expires_at ?? null;

  return {
    isPro: isActiveProProfile(row),
    plan: getEffectiveSubscriptionPlan(row),
    expiresAt,
    trialUsed: Boolean(row?.trial_used),
  };
}

/** Инициация оплаты Robokassa через серверный API route. */
export async function initRobokassaPayment(
  _profileId: string,
  plan: PaidSubscriptionPlan,
  period: SubscriptionPeriod,
): Promise<{ paymentUrl: string; invId: number }> {
  const res = await fetch("/api/subscription/create-payment", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan, period }),
  });

  if (!res.ok) {
    let message = "Ошибка инициации оплаты";
    try {
      const data = (await res.json()) as { error?: string };
      if (data.error) message = data.error;
    } catch {
      //
    }
    throw new Error(message);
  }

  const data = (await res.json()) as { paymentUrl: string; invId: number };
  return { paymentUrl: data.paymentUrl, invId: data.invId };
}

export type UpgradePaymentResult =
  | {
      upgraded: true;
      upgradePrice: 0;
      remainingDays: 0;
    }
  | {
      upgraded?: false;
      paymentUrl: string;
      invId: number;
      upgradePrice: number;
      remainingDays: number;
    };

/** Апгрейд Pro → Pro+ с пропорциональной оплатой за оставшиеся дни. */
export async function initUpgradePayment(): Promise<UpgradePaymentResult> {
  const res = await fetch("/api/subscription/create-upgrade-payment", {
    method: "POST",
    credentials: "include",
  });

  if (!res.ok) {
    let message = "Ошибка инициации апгрейда";
    try {
      const data = (await res.json()) as { error?: string };
      if (data.error) message = data.error;
    } catch {
      //
    }
    throw new Error(message);
  }

  const data = (await res.json()) as UpgradePaymentResult;
  return data;
}

/** Пробный период 3 дня (paid_gate, один раз на аккаунт). */
export async function startTrialSubscription(): Promise<{ proExpiresAt: string }> {
  const res = await fetch("/api/subscription/start-trial", {
    method: "POST",
    credentials: "include",
  });

  if (!res.ok) {
    let message = "Не удалось активировать пробный период";
    try {
      const data = (await res.json()) as { error?: string };
      if (data.error) message = data.error;
    } catch {
      //
    }
    throw new Error(message);
  }

  return (await res.json()) as { proExpiresAt: string };
}

/** Заглушка отмены: сброс Pro у текущего профиля (до webhook Robokassa — только dev/тест). */
export async function cancelProSubscription(profileId: string): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({
      is_pro: false,
      pro_expires_at: null,
      subscription_plan: "free",
    })
    .eq("id", profileId);

  if (error) throw error;
}
