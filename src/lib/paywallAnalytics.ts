import type { PaywallIntent } from "@/lib/paywallIntent";
import { reachYandexMetrikaGoal } from "@/lib/yandexMetrika";

export function trackAuthGateShown(reason: "view_limit" | "write"): void {
  reachYandexMetrikaGoal(`auth_gate_shown_${reason}`);
}

export function trackPaywallShown(intent: PaywallIntent): void {
  reachYandexMetrikaGoal(`paywall_shown_${intent}`);
}

export function trackPaywallDismissed(intent: PaywallIntent): void {
  reachYandexMetrikaGoal("paywall_dismissed");
  reachYandexMetrikaGoal(`paywall_dismissed_${intent}`);
}

export function trackPaywallCtaBuy(intent: PaywallIntent): void {
  reachYandexMetrikaGoal("paywall_cta_buy");
  reachYandexMetrikaGoal(`paywall_cta_buy_${intent}`);
}

export function trackCheckoutStarted(): void {
  reachYandexMetrikaGoal("checkout_started");
}

export function trackTrialStart(): void {
  reachYandexMetrikaGoal("trial_start");
}

export function trackPaymentSuccessAha(): void {
  reachYandexMetrikaGoal("payment_success_aha");
}
