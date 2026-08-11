"use client";

import { supabase } from "@/lib/supabaseClient";
import { isPaidGateMode } from "@/lib/accessMode";

export type SubscriptionStatus = {
  isPro: boolean;
  expiresAt: string | null;
  trialUsed: boolean;
};

export type ProProfileFields = {
  is_pro?: boolean | null;
  pro_expires_at?: string | null;
  trial_used?: boolean | null;
};

export const PRO_PIN_COLOR = "#FDE047";
export const FREE_DM_PARTNERS_PER_DAY = 5;
export const PRO_DM_PARTNERS_PER_DAY = 50;

/** Активная подписка Pro: флаг и (пустая дата или дата в будущем). */
export function isActiveProProfile(row: ProProfileFields | null | undefined): boolean {
  if (!row) return false;
  const expiresAt = row.pro_expires_at ?? null;
  const isProFlag = Boolean(row.is_pro);
  const notExpired =
    !expiresAt || new Date(expiresAt).getTime() > Date.now();
  return isProFlag && notExpired;
}

/** Алиас для UI (профиль в ленте / на карте). */
export const isProActive = isActiveProProfile;

export function getDmPartnersDailyLimit(isPro: boolean): number {
  if (isPaidGateMode()) {
    return isPro ? PRO_DM_PARTNERS_PER_DAY : 0;
  }
  return isPro ? PRO_DM_PARTNERS_PER_DAY : FREE_DM_PARTNERS_PER_DAY;
}

export async function getSubscriptionStatus(
  profileId: string,
): Promise<SubscriptionStatus> {
  const { data, error } = await supabase
    .from("profiles")
    .select("is_pro, pro_expires_at, trial_used")
    .eq("id", profileId)
    .maybeSingle();

  if (error) throw error;

  const row = data as ProProfileFields | null;
  const expiresAt = row?.pro_expires_at ?? null;

  return {
    isPro: isActiveProProfile(row),
    expiresAt,
    trialUsed: Boolean(row?.trial_used),
  };
}

/** Инициация оплаты Robokassa через серверный API route. */
export async function initRobokassaPayment(
  _profileId: string,
): Promise<{ paymentUrl: string; invId: number }> {
  const res = await fetch("/api/subscription/create-payment", {
    method: "POST",
    credentials: "include",
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
    .update({ is_pro: false, pro_expires_at: null })
    .eq("id", profileId);

  if (error) throw error;
}
