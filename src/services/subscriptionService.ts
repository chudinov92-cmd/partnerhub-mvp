"use client";

import { supabase } from "@/lib/supabaseClient";

export type SubscriptionStatus = {
  isPro: boolean;
  expiresAt: string | null;
};

export type ProProfileFields = {
  is_pro?: boolean | null;
  pro_expires_at?: string | null;
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
  return isPro ? PRO_DM_PARTNERS_PER_DAY : FREE_DM_PARTNERS_PER_DAY;
}

export async function getSubscriptionStatus(
  profileId: string,
): Promise<SubscriptionStatus> {
  const { data, error } = await supabase
    .from("profiles")
    .select("is_pro, pro_expires_at")
    .eq("id", profileId)
    .maybeSingle();

  if (error) throw error;

  const row = data as ProProfileFields | null;
  const expiresAt = row?.pro_expires_at ?? null;

  return {
    isPro: isActiveProProfile(row),
    expiresAt,
  };
}

/** Инициация оплаты Robokassa через серверный API route. */
export async function initRobokassaPayment(
  _profileId: string,
): Promise<{ paymentUrl: string }> {
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

  const data = (await res.json()) as { paymentUrl: string };
  return { paymentUrl: data.paymentUrl };
}

/** Заглушка отмены: сброс Pro у текущего профиля (до webhook Robokassa — только dev/тест). */
export async function cancelProSubscription(profileId: string): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ is_pro: false, pro_expires_at: null })
    .eq("id", profileId);

  if (error) throw error;
}
