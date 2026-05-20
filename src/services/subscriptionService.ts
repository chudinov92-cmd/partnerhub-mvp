"use client";

import { supabase } from "@/lib/supabaseClient";

export type SubscriptionStatus = {
  isPro: boolean;
  expiresAt: string | null;
};

export async function getSubscriptionStatus(
  profileId: string,
): Promise<SubscriptionStatus> {
  const { data, error } = await supabase
    .from("profiles")
    .select("is_pro, pro_expires_at")
    .eq("id", profileId)
    .maybeSingle();

  if (error) throw error;

  const row = data as {
    is_pro?: boolean | null;
    pro_expires_at?: string | null;
  } | null;

  const expiresAt = row?.pro_expires_at ?? null;
  const isProFlag = Boolean(row?.is_pro);
  const notExpired =
    !expiresAt || new Date(expiresAt).getTime() > Date.now();

  return {
    isPro: isProFlag && notExpired,
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
