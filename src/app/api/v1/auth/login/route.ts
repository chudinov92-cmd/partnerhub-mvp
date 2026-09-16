import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  clientIpFromRequest,
  loginLimitedJson,
  mapGoTrueLoginError,
  tryAuthLogin,
  validateLoginEmail,
} from "@/lib/authLoginServer";
import { createSupabaseRouteClient } from "@/lib/supabaseServer";

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
    const res = NextResponse.json({ ok: true });
    const sb = createSupabaseRouteClient(cookieStore, {
      wrapResponseCookies: res,
    });

    const { error } = await sb.auth.signInWithPassword({ email, password });

    if (error) {
      await tryAuthLogin({ email, ip, success: false, dryRun: false });
      return NextResponse.json(
        { error: mapGoTrueLoginError(error.message) },
        { status: 401 },
      );
    }

    await tryAuthLogin({ email, ip, success: true, dryRun: false });
    return res;
  } catch (err) {
    console.error("[auth/login POST]", err);
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
