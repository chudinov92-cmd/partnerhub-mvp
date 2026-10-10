import type { Session } from "@supabase/supabase-js";

/**
 * По recovery-ссылке из письма в JWT access_token обычно есть amr с method/token «recovery»
 * (см. GoTrue после redirect type recovery). Используем для UX после обновления страницы.
 */

/** PKCE: после /verify GoTrue редиректит на redirect_to с ?code= (часто на `/`, не на reset-password). */
export function pkceAuthCallbackInUrl(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return new URLSearchParams(window.location.search).has("code");
  } catch {
    return false;
  }
}

/** Маркеры recovery в query/hash (без привязки к window — для тестов). */
export function recoveryTypeInUrl(search: string, hash: string): boolean {
  try {
    if (search.includes("type=recovery")) return true;
    const hashBody = hash.startsWith("#") ? hash.slice(1) : hash;
    if (hashBody) {
      const qp = new URLSearchParams(hashBody);
      if (qp.get("type") === "recovery") return true;
    }
  } catch {
    //
  }
  return hash.includes("type=recovery") || search.includes("type=recovery");
}

/** В адресе после клика по recovery-ссылке (implicit или PKCE с type=recovery). */
export function recoveryCallbackPendingInUrl(): boolean {
  if (typeof window === "undefined") return false;
  return recoveryTypeInUrl(window.location.search, window.location.hash);
}

const PASSWORD_RESET_COMPLETE_KEY = "zeip_password_reset_complete";
const PASSWORD_RESET_COMPLETE_TTL_MS = 5 * 60 * 1000;

/** После успешной смены пароля JWT может ещё содержать amr recovery — не редиректим обратно. */
export function markPasswordResetComplete(): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(PASSWORD_RESET_COMPLETE_KEY, String(Date.now()));
}

export function isPasswordResetComplete(): boolean {
  if (typeof window === "undefined") return false;
  const raw = sessionStorage.getItem(PASSWORD_RESET_COMPLETE_KEY);
  if (!raw) return false;
  const ts = Number(raw);
  if (!Number.isFinite(ts) || Date.now() - ts > PASSWORD_RESET_COMPLETE_TTL_MS) {
    sessionStorage.removeItem(PASSWORD_RESET_COMPLETE_KEY);
    return false;
  }
  return true;
}

export function clearPasswordResetComplete(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(PASSWORD_RESET_COMPLETE_KEY);
}

export function isPasswordRecoverySession(session: Session | null): boolean {
  if (!session?.user || !session.access_token) return false;
  // recovery_sent_at — только факт отправки письма; не активная recovery-сессия.
  // Активная recovery определяется по amr в JWT (method «recovery» после клика по ссылке).
  try {
    const parts = session.access_token.split(".");
    if (parts.length < 2) return false;
    const json = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(json)) as { amr?: unknown };
    const amr = payload.amr;
    if (!Array.isArray(amr)) return false;
    return amr.some((entry) => {
      if (typeof entry === "string") return entry === "recovery";
      if (typeof entry === "object" && entry !== null && "method" in entry) {
        return (entry as { method?: string }).method === "recovery";
      }
      return false;
    });
  } catch {
    return false;
  }
}
