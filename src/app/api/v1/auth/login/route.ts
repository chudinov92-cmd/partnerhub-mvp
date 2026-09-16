import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  clientIpFromRequest,
  isAuthLoginUnavailableError,
  loginLimitedJson,
  mapGoTrueLoginError,
  tryAuthLogin,
  validateLoginEmail,
} from "@/lib/authLoginServer";
import { createSupabaseRouteClient } from "@/lib/supabaseServer";
import { copyResponseCookies } from "@/lib/supabaseMiddlewareAuth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: { email?: unknown; password?: unknown };
  try {
    body = (await req.json()) as { email?: unknown; password?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = validateLoginEmail(body.email);
  if (!email) {
    return NextResponse.json({ error: "Укажите корректный email." }, { status: 400 });
  }

  const password = typeof body.password === "string" ? body.password : "";
  if (!password) {
    return NextResponse.json({ error: "Укажите пароль." }, { status: 400 });
  }

  const ip = clientIpFromRequest(req);

  try {
    const precheck = await tryAuthLogin({ email, ip, dryRun: true });
    if (!precheck.allowed) {
      const limited = loginLimitedJson(precheck);
      return NextResponse.json(limited.body, { status: limited.status });
    }

    const cookieStore = await cookies();
    const sessionResponse = NextResponse.json({ ok: true });
    const sb = createSupabaseRouteClient(cookieStore, {
      wrapResponseCookies: sessionResponse,
    });

    const { data, error } = await sb.auth.signInWithPassword({ email, password });

    if (error) {
      await tryAuthLogin({ email, ip, success: false, dryRun: false });
      return NextResponse.json(
        { error: mapGoTrueLoginError(error.message) },
        { status: 401 },
      );
    }

    await tryAuthLogin({ email, ip, success: true, dryRun: false });
    const res = NextResponse.json({
      ok: true,
      user_id: data.user?.id ?? null,
    });
    copyResponseCookies(sessionResponse, res);
    return res;
  } catch (err) {
    console.error("[auth/login POST]", err);
    if (isAuthLoginUnavailableError(err)) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    return NextResponse.json(
      { error: "Не удалось войти. Попробуйте ещё раз." },
      { status: 500 },
    );
  }
}
