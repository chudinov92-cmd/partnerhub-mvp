export const PAYMENT_PENDING_INV_ID_KEY = "zeip_pending_payment_inv_id";

export type RobokassaReturnParams = {
  invId: string | null;
  outSum: string | null;
  signatureValue: string | null;
  isTest: boolean;
};

export function parseRobokassaReturnParams(search: string): RobokassaReturnParams {
  const params = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search,
  );
  const invRaw = params.get("InvId") ?? params.get("invId");
  return {
    invId: invRaw?.trim() || null,
    outSum: params.get("OutSum") ?? params.get("outSum"),
    signatureValue: params.get("SignatureValue") ?? params.get("signatureValue"),
    isTest: params.get("IsTest") === "1",
  };
}

export function isRobokassaReturnUrl(search: string): boolean {
  const { invId, outSum } = parseRobokassaReturnParams(search);
  return Boolean(invId || outSum);
}

export function buildPaymentSuccessPath(search: string): string {
  const q = search.startsWith("?") ? search : search ? `?${search}` : "";
  return `/payment/success${q}`;
}

/** Legacy: Robokassa Success URL был /subscription?InvId=... */
export function shouldRedirectRobokassaReturnFromSubscription(
  pathname: string,
  search: string,
): boolean {
  return pathname === "/subscription" && isRobokassaReturnUrl(search);
}

export function savePendingPaymentInvId(invId: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(PAYMENT_PENDING_INV_ID_KEY, invId);
  } catch {
    //
  }
}

export function readPendingPaymentInvId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(PAYMENT_PENDING_INV_ID_KEY);
  } catch {
    return null;
  }
}

export function clearPendingPaymentInvId(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(PAYMENT_PENDING_INV_ID_KEY);
  } catch {
    //
  }
}

export function resolvePaymentInvId(search: string): string | null {
  const fromUrl = parseRobokassaReturnParams(search).invId;
  if (fromUrl) return fromUrl;
  return readPendingPaymentInvId();
}

export function buildPaymentSuccessLoginRedirect(invId: string): string {
  const target = `/payment/success?InvId=${encodeURIComponent(invId)}`;
  return `/auth?redirect=${encodeURIComponent(target)}`;
}

export function getSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "https://zeip.ru";
}
