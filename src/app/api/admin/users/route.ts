import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  createSupabaseAdminClient,
  createSupabaseMiddlewareClient,
  createSupabaseRouteClient,
} from "@/lib/supabaseServer";
import {
  fetchAdminRoleForAuthUser,
  hasMinRole,
} from "@/app/api/admin/_lib/requireAdmin";

/** Мутации профилей (блокировка) — только после JWT + роль support+. */
export async function PATCH(req: Request) {
  try {
    const cookieStore = await cookies();
    const sb = createSupabaseRouteClient(cookieStore);
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = await fetchAdminRoleForAuthUser(user.id);
    if (!hasMinRole(role, "support")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let body: { profile_id?: string; is_blocked?: boolean };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const profileId = typeof body.profile_id === "string" ? body.profile_id : "";
    const isBlocked = typeof body.is_blocked === "boolean" ? body.is_blocked : undefined;
    if (!profileId || typeof isBlocked !== "boolean") {
      return NextResponse.json(
        { error: "Ожидалось profile_id (string) и is_blocked (boolean)" },
        { status: 400 },
      );
    }

    const adminSb = createSupabaseAdminClient();
    const { error: updErr } = await adminSb
      .from("profiles")
      .update({ is_blocked: isBlocked })
      .eq("id", profileId);
    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 500 });
    }

    await adminSb.from("admin_audit_log").insert({
      actor_auth_user_id: user.id,
      action: "profiles.toggle_block",
      target_type: "profile",
      target_id: profileId,
      payload: { next_is_blocked: isBlocked },
    });

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    if (msg.includes("SUPABASE_SERVICE_ROLE_KEY")) {
      return NextResponse.json(
        { error: "Сервер: не задан SUPABASE_SERVICE_ROLE_KEY" },
        { status: 500 },
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
