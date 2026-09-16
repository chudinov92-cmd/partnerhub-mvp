import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabaseServer";
import { requireMinRole } from "@/app/api/admin/_lib/requireAdmin";
import { jsonRouteError } from "@/app/api/_lib/jsonRouteError";

type ModerationStatus = "active" | "hidden" | "deleted";

/** Патч модерации поста — moderator+ ; DELETE поста — moderator+ ; аудит через service_role. */
export async function PATCH(req: Request) {
  try {
    const auth = await requireMinRole("moderator");
    if (!auth.ok) return auth.response;

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
      actor_auth_user_id: auth.authUserId,
      action: "posts.set_moderation_status",
      target_type: "post",
      target_id: postId,
      payload: { next_status: nextStatus, reason },
    });

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return jsonRouteError("[admin/posts PATCH]", e);
  }
}

export async function DELETE(req: Request) {
  try {
    const auth = await requireMinRole("moderator");
    if (!auth.ok) return auth.response;

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
      actor_auth_user_id: auth.authUserId,
      action: "posts.hard_delete",
      target_type: "post",
      target_id: postId,
      payload: {},
    });

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return jsonRouteError("[admin/posts DELETE]", e);
  }
}
