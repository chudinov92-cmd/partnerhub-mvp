import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const SUPABASE_AUTH_COOKIE = /^sb-.*-auth-token(\.\d+)?$/i;

/** Есть ли cookie сессии Supabase (включая chunked `.0`, `.1`, …). */
export function hasSupabaseAuthCookie(request: NextRequest): boolean {
  return request.cookies.getAll().some((c) => SUPABASE_AUTH_COOKIE.test(c.name));
}

function authErrorStatus(error: Error): number | undefined {
  const status = (error as { status?: number }).status;
  return typeof status === "number" ? status : undefined;
}

/** Сеть / 5xx GoTrue — не считаем пользователя гостем. */
export function isAuthUnavailableError(error: Error | null): boolean {
  if (!error) return false;

  const status = authErrorStatus(error);
  if (status !== undefined && status >= 500) return true;

  const msg = error.message.toLowerCase();
  return (
    msg.includes("fetch failed") ||
    msg.includes("network") ||
    msg.includes("timeout") ||
    msg.includes("econnrefused") ||
    msg.includes("enotfound") ||
    msg.includes("socket") ||
    msg.includes("abort")
  );
}

/** Явно протухшая или битая сессия — на /auth, не на лендинг. */
export function isAuthSessionInvalid(error: Error | null): boolean {
  if (!error) return false;

  const status = authErrorStatus(error);
  if (status === 401 || status === 403) return true;

  const msg = error.message.toLowerCase();
  return (
    msg.includes("invalid") ||
    msg.includes("expired") ||
    msg.includes("jwt") ||
    msg.includes("session not found") ||
    msg.includes("refresh token")
  );
}

export function copyResponseCookies(
  from: NextResponse,
  to: NextResponse,
): void {
  for (const cookie of from.cookies.getAll()) {
    to.cookies.set(cookie);
  }
}

/** Редирект с Set-Cookie, записанными Supabase в sessionResponse. */
export function redirectPreservingCookies(
  sessionResponse: NextResponse,
  url: URL,
): NextResponse {
  const redirectResponse = NextResponse.redirect(url);
  copyResponseCookies(sessionResponse, redirectResponse);
  return redirectResponse;
}
