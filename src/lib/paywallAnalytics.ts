import type { PaywallIntent } from "@/lib/paywallIntent";
import { reachYandexMetrikaGoal } from "@/lib/yandexMetrika";

type PaywallEventPayload = {
  event_type:
    | "shown"
    | "dismissed"
    | "cta_buy"
    | "trial_start"
    | "checkout_started"
    | "payment_success";
  intent?: string;
  plan?: string;
  period?: string;
};

async function logPaywallEvent(payload: PaywallEventPayload): Promise<void> {
  try {
    await fetch("/api/analytics/paywall-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch {
    // analytics must not break UX
  }
}

export function trackAuthGateShown(reason: "view_limit" | "write"): void {
  reachYandexMetrikaGoal(`auth_gate_shown_${reason}`);
}

export function trackPaywallShown(intent: PaywallIntent): void {
  reachYandexMetrikaGoal(`paywall_shown_${intent}`);
  void logPaywallEvent({ event_type: "shown", intent });
}

export function trackPaywallDismissed(intent: PaywallIntent): void {
  reachYandexMetrikaGoal("paywall_dismissed");
  reachYandexMetrikaGoal(`paywall_dismissed_${intent}`);
  void logPaywallEvent({ event_type: "dismissed", intent });
}

export function trackPaywallCtaBuy(intent: PaywallIntent): void {
  reachYandexMetrikaGoal("paywall_cta_buy");
  reachYandexMetrikaGoal(`paywall_cta_buy_${intent}`);
  void logPaywallEvent({ event_type: "cta_buy", intent });
}

export function trackCheckoutStarted(): void {
  reachYandexMetrikaGoal("checkout_started");
  void logPaywallEvent({ event_type: "checkout_started" });
}

export function trackTrialStart(): void {
  reachYandexMetrikaGoal("trial_start");
  void logPaywallEvent({ event_type: "trial_start" });
}

export function trackPaymentSuccessAha(): void {
  reachYandexMetrikaGoal("payment_success_aha");
  void logPaywallEvent({ event_type: "payment_success" });
}
