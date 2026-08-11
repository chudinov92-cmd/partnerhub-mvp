import type { PaywallIntent } from "@/lib/paywallIntent";

const DISMISS_PREFIX = "zeip_paywall_dismiss_";
const SOFT_BANNER_KEY = "zeip_paywall_soft_banner";
const DISMISS_TTL_MS = 24 * 60 * 60 * 1000;

function readDismissAt(intent: PaywallIntent): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`${DISMISS_PREFIX}${intent}`);
    if (!raw) return null;
    const ts = Number.parseInt(raw, 10);
    return Number.isFinite(ts) ? ts : null;
  } catch {
    return null;
  }
}

export function canShowPaywallDrawer(intent: PaywallIntent): boolean {
  const dismissedAt = readDismissAt(intent);
  if (!dismissedAt) return true;
  return Date.now() - dismissedAt >= DISMISS_TTL_MS;
}

export function recordPaywallDismiss(intent: PaywallIntent): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`${DISMISS_PREFIX}${intent}`, String(Date.now()));
    localStorage.setItem(SOFT_BANNER_KEY, "1");
  } catch {
    //
  }
}

export function shouldShowPaywallSoftBanner(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(SOFT_BANNER_KEY) === "1";
  } catch {
    return false;
  }
}

export function dismissPaywallSoftBanner(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(SOFT_BANNER_KEY);
  } catch {
    //
  }
}
