import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  applyCspToRequestHeaders,
  applySecurityHeaders,
  generateCspNonce,
  isCspReportOnly,
} from "@/lib/csp";
import { PROFILE_MAP_QUERY_PARAM } from "@/lib/profileShare";
import {
  hasSupabaseAuthCookie,
  isAuthUnavailableError,
  redirectPreservingCookies,
} from "@/lib/supabaseMiddlewareAuth";
import {
  createSupabaseMiddlewareClient,
  type SupabaseMiddlewareResponseHolder,
} from "@/lib/supabaseServer";

function finalizeResponse(
  response: NextResponse,
  nonce: string,
  request: NextRequest,
): NextResponse {
  return applySecurityHeaders(response, nonce, {
    reportOnly: isCspReportOnly(),
  });
}

function createMiddlewareHolder(
  requestHeaders: Headers,
): SupabaseMiddlewareResponseHolder {
  return {
    current: NextResponse.next({
      request: { headers: requestHeaders },
    }),
    requestHeaders,
  };
}

function needsAuthCheck(pathname: string): boolean {
  return (
    pathname === "/map" ||
    pathname.startsWith("/map/") ||
    pathname.startsWith("/admin") ||
    pathname === "/payment/success" ||
    pathname === "/payment/fail"
  );
}

/**
 * /admin/* — JWT + admin_users
 * /map — только авторизованные (гости → лендинг; битая сессия → /auth)
 * /payment/success, /payment/fail — refresh cookie-сессии после Robokassa
 * Все HTML-страницы — CSP nonce + security headers
 */
export async function middleware(request: NextRequest) {
  const nonce = generateCspNonce();
  const requestHeaders = new Headers(request.headers);
  applyCspToRequestHeaders(requestHeaders, nonce, {
    reportOnly: isCspReportOnly(),
  });

  const { pathname } = request.nextUrl;

  if (!needsAuthCheck(pathname)) {
    return finalizeResponse(
      NextResponse.next({
        request: { headers: requestHeaders },
      }),
      nonce,
      request,
    );
  }

  const holder = createMiddlewareHolder(requestHeaders);

  const sb = createSupabaseMiddlewareClient(request, holder);
  const {
    data: { user },
    error: authError,
  } = await sb.auth.getUser();

  if (pathname === "/map" || pathname.startsWith("/map/")) {
    if (user) {
      return finalizeResponse(holder.current, nonce, request);
    }

    const hasAuthCookie = hasSupabaseAuthCookie(request);
    const profileId = request.nextUrl.searchParams.get("profile")?.trim();
    const mapRedirectTarget = profileId
      ? `${request.nextUrl.pathname}?${PROFILE_MAP_QUERY_PARAM}=${encodeURIComponent(profileId)}`
      : "/map";

    if (hasAuthCookie) {
      if (authError && isAuthUnavailableError(authError)) {
        return finalizeResponse(holder.current, nonce, request);
      }

      const url = request.nextUrl.clone();
      url.pathname = "/auth";
      url.search = "";
      url.searchParams.set("redirect", mapRedirectTarget);
      return finalizeResponse(
        redirectPreservingCookies(holder.current, url),
        nonce,
        request,
      );
    }

    if (profileId) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth";
      url.search = "";
      url.searchParams.set("redirect", mapRedirectTarget);
      return finalizeResponse(
        redirectPreservingCookies(holder.current, url),
        nonce,
        request,
      );
    }

    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return finalizeResponse(
      redirectPreservingCookies(holder.current, url),
      nonce,
      request,
    );
  }

  if (pathname === "/payment/success" || pathname === "/payment/fail") {
    return finalizeResponse(holder.current, nonce, request);
  }

  if (!pathname.startsWith("/admin")) {
    return finalizeResponse(holder.current, nonce, request);
  }

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth";
    url.searchParams.set("redirect", request.nextUrl.pathname);
    return finalizeResponse(
      redirectPreservingCookies(holder.current, url),
      nonce,
      request,
    );
  }

  const { data: adminRow, error: adminErr } = await sb
    .from("admin_users")
    .select("auth_user_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (adminErr || !adminRow) {
    return finalizeResponse(
      new NextResponse("Доступ запрещён", { status: 403 }),
      nonce,
      request,
    );
  }

  return finalizeResponse(holder.current, nonce, request);
}

export const config = {
  matcher: [
    {
      source:
        "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|js|css|woff2?)$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
