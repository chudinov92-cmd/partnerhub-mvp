import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createSupabaseMiddlewareClient } from "@/lib/supabaseServer";

/**
 * /admin/* — JWT + admin_users
 * /map — только авторизованные (гости → лендинг)
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const response = NextResponse.next({
    request: { headers: request.headers },
  });

  const sb = createSupabaseMiddlewareClient(request, response);
  const {
    data: { user },
  } = await sb.auth.getUser();

  if (pathname === "/map" || pathname.startsWith("/map/")) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.search = "";
      return NextResponse.redirect(url);
    }
    return response;
  }

  if (!pathname.startsWith("/admin")) {
    return response;
  }

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth";
    url.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  const { data: adminRow, error: adminErr } = await sb
    .from("admin_users")
    .select("auth_user_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (adminErr || !adminRow) {
    return new NextResponse("Доступ запрещён", { status: 403 });
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/map", "/map/:path*"],
};
