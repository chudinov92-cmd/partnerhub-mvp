import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
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

/**
 * /admin/* — JWT + admin_users
 * /map — только авторизованные (гости → лендинг; битая сессия → /auth)
 * /payment/success, /payment/fail — refresh cookie-сессии после Robokassa
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const holder: SupabaseMiddlewareResponseHolder = {
    current: NextResponse.next({
      request: { headers: request.headers },
    }),
  };

  const sb = createSupabaseMiddlewareClient(request, holder);
  const {
    data: { user },
    error: authError,
  } = await sb.auth.getUser();

  if (pathname === "/map" || pathname.startsWith("/map/")) {
    if (user) {
      return holder.current;
    }

    const hasAuthCookie = hasSupabaseAuthCookie(request);
    const profileId = request.nextUrl.searchParams.get("profile")?.trim();
    const mapRedirectTarget = profileId
      ? `${request.nextUrl.pathname}?${PROFILE_MAP_QUERY_PARAM}=${encodeURIComponent(profileId)}`
      : "/map";

    // Cookie есть — не считаем гостем: либо fail-open, либо /auth.
    if (hasAuthCookie) {
      if (authError && isAuthUnavailableError(authError)) {
        return holder.current;
      }

      const url = request.nextUrl.clone();
      url.pathname = "/auth";
      url.search = "";
      url.searchParams.set("redirect", mapRedirectTarget);
      return redirectPreservingCookies(holder.current, url);
    }

    // Настоящий гость (нет cookie сессии)
    if (profileId) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth";
      url.search = "";
      url.searchParams.set("redirect", mapRedirectTarget);
      return redirectPreservingCookies(holder.current, url);
    }

    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return redirectPreservingCookies(holder.current, url);
  }

  if (
    pathname === "/payment/success" ||
    pathname === "/payment/fail"
  ) {
    return holder.current;
  }

  if (!pathname.startsWith("/admin")) {
    return holder.current;
  }

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth";
    url.searchParams.set("redirect", request.nextUrl.pathname);
    return redirectPreservingCookies(holder.current, url);
  }

  const { data: adminRow, error: adminErr } = await sb
    .from("admin_users")
    .select("auth_user_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (adminErr || !adminRow) {
    return new NextResponse("Доступ запрещён", { status: 403 });
  }

  return holder.current;
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/map",
    "/map/:path*",
    "/payment/success",
    "/payment/fail",
  ],
};
