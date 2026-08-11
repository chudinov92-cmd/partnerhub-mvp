import { reachYandexMetrikaGoal } from "@/lib/yandexMetrika";

export function trackPaymentSuccessOpen(): void {
  reachYandexMetrikaGoal("payment_success_open");
}

export function trackPaymentSuccessActivated(): void {
  reachYandexMetrikaGoal("payment_success_activated");
}

export function trackPaymentSuccessNeedLogin(): void {
  reachYandexMetrikaGoal("payment_success_need_login");
}

export function trackPaymentSuccessTimeout(): void {
  reachYandexMetrikaGoal("payment_success_timeout");
}
