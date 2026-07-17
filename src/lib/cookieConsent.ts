export const COOKIE_CONSENT_KEY = "cookie_consent";
export const ANONYMOUS_UID_KEY = "anonymous_uid";
export const COOKIE_POLICY_VERSION = "v2026.1";

export const COOKIE_CONSENT_TYPES = ["all", "necessary_only", "marketing"] as const;
export type CookieConsentType = (typeof COOKIE_CONSENT_TYPES)[number];

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export function getOrCreateAnonymousUid(): string {
  if (typeof window === "undefined") {
    throw new Error("anonymous_uid доступен только в браузере");
  }

  const existing = window.localStorage.getItem(ANONYMOUS_UID_KEY);
  if (existing && isValidUuid(existing)) {
    return existing;
  }

  const uid = crypto.randomUUID();
  window.localStorage.setItem(ANONYMOUS_UID_KEY, uid);
  return uid;
}

export function hasCookieConsentAccepted(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(COOKIE_CONSENT_KEY) === "accepted";
}

export function getStoredAnonymousUid(): string | null {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(ANONYMOUS_UID_KEY);
  return value && isValidUuid(value) ? value : null;
}

export function maskIpAddress(ip: string): string {
  const trimmed = ip.trim();
  const ipv4Match = trimmed.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3}\.)\d{1,3}$/);
  if (ipv4Match) {
    return `${ipv4Match[1]}0`;
  }

  if (trimmed.includes(":")) {
    const parts = trimmed.split(":");
    parts[parts.length - 1] = "0";
    return parts.join(":");
  }

  return trimmed;
}

export function getClientIpFromRequest(req: Request): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? null;
  }
  return req.headers.get("x-real-ip")?.trim() ?? null;
}

export function isSupportedPolicyVersion(value: string): boolean {
  return value === COOKIE_POLICY_VERSION;
}

export function isSupportedConsentType(value: string): value is CookieConsentType {
  return (COOKIE_CONSENT_TYPES as readonly string[]).includes(value);
}

/** Fire-and-forget: привязка anonymous_uid к текущей сессии после входа/регистрации. */
export function linkAnonymousCookieConsent(): void {
  const anonymousUid = getStoredAnonymousUid();
  if (!anonymousUid) return;

  void fetch("/api/v1/privacy/link-consent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ anonymous_uid: anonymousUid }),
    credentials: "include",
  }).catch(() => {
    // не блокируем UX
  });
}
