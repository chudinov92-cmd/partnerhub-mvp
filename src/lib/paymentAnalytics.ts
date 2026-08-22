import { reachYandexMetrikaGoal } from "@/lib/yandexMetrika";

export function trackPaymentSuccessOpen(): void {
  reachYandexMetrikaGoal("payment_success_open");
}

export function trackPaymentSuccessActivated(params?: {
  order_price?: number;
  currency?: string;
}): void {
  reachYandexMetrikaGoal("payment_success_activated", params);
}

export function trackPaymentSuccessNeedLogin(): void {
  reachYandexMetrikaGoal("payment_success_need_login");
}

export function trackPaymentSuccessTimeout(): void {
  reachYandexMetrikaGoal("payment_success_timeout");
}
