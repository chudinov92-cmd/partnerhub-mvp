export type AccessMode = "freemium" | "paid_gate";

/** Режим доступа из env сборки (freemium = текущий Free/Pro). */
export function getAccessMode(): AccessMode {
  const raw = process.env.NEXT_PUBLIC_ACCESS_MODE?.trim();
  return raw === "paid_gate" ? "paid_gate" : "freemium";
}

export function isPaidGateMode(): boolean {
  return getAccessMode() === "paid_gate";
}

/** Тип строки профиля с Pro-полями (инжектится из приложения). */
export type ProProfileFields = {
  is_pro?: boolean | null;
  pro_expires_at?: string | null;
  subscription_plan?: "free" | "pro" | "pro_plus" | null;
};

/** Активная подписка: зависит от переданного isActiveProProfile (инжекция, разрыв цикла). */
export function hasActiveSubscription(
  row: ProProfileFields | null | undefined,
  isActiveProProfile: (row: ProProfileFields | null | undefined) => boolean,
): boolean {
  return isActiveProProfile(row);
}
