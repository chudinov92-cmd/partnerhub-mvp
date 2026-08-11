import {
  isActiveProProfile,
  type ProProfileFields,
} from "@/services/subscriptionService";

export type AccessMode = "freemium" | "paid_gate";

/** Режим доступа из env сборки (freemium = текущий Free/Pro). */
export function getAccessMode(): AccessMode {
  const raw = process.env.NEXT_PUBLIC_ACCESS_MODE?.trim();
  return raw === "paid_gate" ? "paid_gate" : "freemium";
}

export function isPaidGateMode(): boolean {
  return getAccessMode() === "paid_gate";
}

/** Активная подписка: в paid_gate — ключ участия; в freemium — Pro. */
export function hasActiveSubscription(
  row: ProProfileFields | null | undefined,
): boolean {
  return isActiveProProfile(row);
}
