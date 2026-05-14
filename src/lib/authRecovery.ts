import type { Session } from "@supabase/supabase-js";

/**
 * По recovery-ссылке из письма в JWT access_token обычно есть amr с method/token «recovery»
 * (см. GoTrue после redirect type recovery). Используем для UX после обновления страницы.
 */

/** В адресе после клика по ссылке из письма (implicit / некоторые варианты PKCE в query). */
export function recoveryCallbackPendingInUrl(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.location.search.includes("type=recovery")) return true;
    const hash = window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : window.location.hash;
    if (!hash) return false;
    const qp = new URLSearchParams(hash);
    if (qp.get("type") === "recovery") return true;
  } catch {
    //
  }
  return (
    window.location.hash.includes("type=recovery") ||
    window.location.search.includes("type=recovery")
  );
}

export function isPasswordRecoverySession(session: Session | null): boolean {
  if (!session?.access_token) return false;
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
