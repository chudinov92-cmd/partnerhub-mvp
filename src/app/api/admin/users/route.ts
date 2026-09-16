import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabaseServer";
import { requireMinRole } from "@/app/api/admin/_lib/requireAdmin";
import { jsonRouteError } from "@/app/api/_lib/jsonRouteError";

/** Мутации профилей (блокировка) — только после JWT + роль support+. */
export async function PATCH(req: Request) {
  try {
    const auth = await requireMinRole("support");
    if (!auth.ok) return auth.response;

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
      actor_auth_user_id: auth.authUserId,
      action: "profiles.toggle_block",
      target_type: "profile",
      target_id: profileId,
      payload: { next_is_blocked: isBlocked },
    });

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return jsonRouteError("[admin/users PATCH]", e);
  }
}
