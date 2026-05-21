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

/** Заглушка: инициация оплаты Robokassa (подключить MerchantLogin, пароль, InvId). */
export async function initRobokassaPayment(
  _profileId: string,
): Promise<{ paymentUrl: string }> {
  const merchantLogin = process.env.NEXT_PUBLIC_ROBOKASSA_MERCHANT_LOGIN;
  if (!merchantLogin) {
    throw new Error(
      "Оплата временно недоступна: не настроен NEXT_PUBLIC_ROBOKASSA_MERCHANT_LOGIN. Интеграция Robokassa будет подключена на сервере.",
    );
  }

  const baseUrl = "https://auth.robokassa.ru/Merchant/Index.aspx";
  const params = new URLSearchParams({
    MerchantLogin: merchantLogin,
    OutSum: "249.00",
    Description: "Подписка Zeip Pro на 1 месяц",
    // InvId, SignatureValue — на API route при реальной интеграции
  });

  return { paymentUrl: `${baseUrl}?${params.toString()}` };
}

/** Заглушка отмены: сброс Pro у текущего профиля (до webhook Robokassa — только dev/тест). */
export async function cancelProSubscription(profileId: string): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ is_pro: false, pro_expires_at: null })
    .eq("id", profileId);

  if (error) throw error;
}
