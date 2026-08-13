export type PaywallIntent = "dm" | "chat" | "pin" | "banner";

export type PaywallIntentContext = {
  intent: PaywallIntent;
  profileId?: string;
  profileName?: string | null;
  profileRole?: string | null;
};

export const PAYWALL_PENDING_STORAGE_KEY = "zeip_paywall_pending";
export const PAYWALL_WRITE_PARAM = "write";
export const PAYWALL_REASON_PARAM = "reason";
export const PAYWALL_PAYMENT_PARAM = "payment";

export function isPaywallIntent(value: string | null | undefined): value is PaywallIntent {
  return (
    value === "dm" ||
    value === "chat" ||
    value === "pin" ||
    value === "banner"
  );
}

export function buildMapWriteRedirect(profileId: string): string {
  return `/map?${PAYWALL_WRITE_PARAM}=${encodeURIComponent(profileId)}`;
}

export function buildAuthRedirectForMapWrite(profileId: string): string {
  return `/auth?redirect=${encodeURIComponent(buildMapWriteRedirect(profileId))}`;
}

export function parseMapSearchParams(search: string): {
  writeProfileId: string | null;
  reason: PaywallIntent | null;
  payment: string | null;
} {
  if (typeof window === "undefined" && !search) {
    return { writeProfileId: null, reason: null, payment: null };
  }
  const params = new URLSearchParams(search.startsWith("?") ? search : `?${search}`);
  const writeRaw = params.get(PAYWALL_WRITE_PARAM);
  const reasonRaw = params.get(PAYWALL_REASON_PARAM);
  return {
    writeProfileId: writeRaw?.trim() || null,
    reason: isPaywallIntent(reasonRaw) ? reasonRaw : null,
    payment: params.get(PAYWALL_PAYMENT_PARAM),
  };
}

export function clearPaywallQueryParams(): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.delete(PAYWALL_WRITE_PARAM);
  url.searchParams.delete(PAYWALL_REASON_PARAM);
  url.searchParams.delete(PAYWALL_PAYMENT_PARAM);
  window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
}

export function savePendingPaywallContext(ctx: PaywallIntentContext): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(PAYWALL_PENDING_STORAGE_KEY, JSON.stringify(ctx));
  } catch {
    //
  }
}

export function readPendingPaywallContext(): PaywallIntentContext | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(PAYWALL_PENDING_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PaywallIntentContext;
    if (!parsed || !isPaywallIntent(parsed.intent)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearPendingPaywallContext(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(PAYWALL_PENDING_STORAGE_KEY);
  } catch {
    //
  }
}

export function paywallIntentTitle(ctx: PaywallIntentContext): string {
  if (ctx.intent === "dm" && ctx.profileName) {
    return `Чтобы написать ${ctx.profileName}`;
  }
  if (ctx.intent === "chat") {
    return "Чтобы писать в общий чат";
  }
  if (ctx.intent === "pin") {
    return "Чтобы ваш пин был виден на карте";
  }
  if (ctx.intent === "banner") {
    return "Доступ ко всем функциям Zeip";
  }
  return "Оформите подписку Zeip";
}

export function paywallIntentSubtitle(ctx: PaywallIntentContext): string {
  if (ctx.intent === "dm" && ctx.profileRole) {
    return ctx.profileRole;
  }
  if (ctx.intent === "chat") {
    return "Подписка открывает участие в сети города и России";
  }
  if (ctx.intent === "pin") {
    return "Другие участники смогут найти вас на карте";
  }
  if (ctx.intent === "banner") {
    return "Подписка открывает переписку и просмотр профилей без лимита";
  }
  return "Карту можно смотреть бесплатно. Подписка открывает действия.";
}
