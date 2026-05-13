import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createSupabaseMiddlewareClient } from "@/lib/supabaseServer";

/**
 * Серверная защита /admin/*
 * После авторизации через JWT проверяем строку admin_users тем же ключом anon + cookies.
 */
export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: { headers: request.headers },
  });

  const sb = createSupabaseMiddlewareClient(request, response);

  const {
    data: { user },
  } = await sb.auth.getUser();

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
  matcher: ["/admin/:path*"],
};
