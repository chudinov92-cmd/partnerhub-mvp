import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseAdminClient, createSupabaseRouteClient } from "@/lib/supabaseServer";
import {
  fetchAdminRoleForAuthUser,
  hasMinRole,
} from "@/app/api/admin/_lib/requireAdmin";

type ModerationStatus = "active" | "hidden" | "deleted";

/** Патч модерации поста — moderator+ ; DELETE поста — moderator+ ; аудит через service_role. */
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
    if (!hasMinRole(role, "moderator")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let body: {
      post_id?: string;
      moderation_status?: ModerationStatus;
      moderation_reason?: string | null;
    };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const postId = typeof body.post_id === "string" ? body.post_id : "";
    const nextStatus = body.moderation_status;
    if (!postId || !nextStatus) {
      return NextResponse.json(
        { error: "Ожидалось post_id и moderation_status" },
        { status: 400 },
      );
    }

    const reason =
      typeof body.moderation_reason === "string" || body.moderation_reason === null
        ? body.moderation_reason
        : null;

    const adminSb = createSupabaseAdminClient();
    const moderatedAt = new Date().toISOString();
    const { error: updErr } = await adminSb
      .from("posts")
      .update({
        moderation_status: nextStatus,
        moderation_reason: reason,
        moderated_at: moderatedAt,
      })
      .eq("id", postId);
    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 500 });
    }

    await adminSb.from("admin_audit_log").insert({
      actor_auth_user_id: user.id,
      action: "posts.set_moderation_status",
      target_type: "post",
      target_id: postId,
      payload: { next_status: nextStatus, reason },
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

export async function DELETE(req: Request) {
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
    if (!hasMinRole(role, "moderator")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const url = new URL(req.url);
    const postId = url.searchParams.get("post_id");
    if (!postId) {
      return NextResponse.json({ error: "Нужен query post_id" }, { status: 400 });
    }

    const adminSb = createSupabaseAdminClient();
    const { error: delErr } = await adminSb.from("posts").delete().eq("id", postId);
    if (delErr) {
      return NextResponse.json({ error: delErr.message }, { status: 500 });
    }

    await adminSb.from("admin_audit_log").insert({
      actor_auth_user_id: user.id,
      action: "posts.hard_delete",
      target_type: "post",
      target_id: postId,
      payload: {},
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
