import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseAdminClient, createSupabaseRouteClient } from "@/lib/supabaseServer";
import {
  fetchAdminRoleForAuthUser,
  hasMinRole,
} from "@/app/api/admin/_lib/requireAdmin";
import { resolveSupportProfileId } from "@/app/api/admin/support/_lib/supportProfile";

/** Ответ от имени поддержки или закрытие обращения. */
export async function POST(req: Request) {
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

    let body: { chatId?: string; content?: string; action?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const chatId = typeof body.chatId === "string" ? body.chatId : "";
    if (!chatId) {
      return NextResponse.json({ error: "Ожидался chatId" }, { status: 400 });
    }

    const adminSb = createSupabaseAdminClient();
    const supportProfileId = await resolveSupportProfileId(adminSb);

    const { data: members, error: memErr } = await adminSb
      .from("chat_members")
      .select("user_id")
      .eq("chat_id", chatId);
    if (memErr) {
      return NextResponse.json({ error: memErr.message }, { status: 500 });
    }
    const memberIds = (members ?? []).map((m) => (m as { user_id: string }).user_id);
    if (!memberIds.includes(supportProfileId)) {
      return NextResponse.json({ error: "Не чат поддержки" }, { status: 400 });
    }

    if (body.action === "close") {
      const { error: closeErr } = await adminSb
        .from("chats")
        .update({ is_closed: true })
        .eq("id", chatId);
      if (closeErr) {
        return NextResponse.json({ error: closeErr.message }, { status: 500 });
      }

      await adminSb.from("admin_audit_log").insert({
        actor_auth_user_id: user.id,
        action: "support.close_appeal",
        target_type: "chat",
        target_id: chatId,
        payload: {},
      });

      return NextResponse.json({ ok: true, closed: true });
    }

    const content =
      typeof body.content === "string" ? body.content.trim().slice(0, 1000) : "";
    if (!content) {
      return NextResponse.json(
        { error: "Ожидался непустой content" },
        { status: 400 },
      );
    }

    const { data: msg, error: insErr } = await adminSb
      .from("messages")
      .insert({
        chat_id: chatId,
        sender_id: supportProfileId,
        content,
      })
      .select("id, content, sender_id, created_at, edited_at")
      .single();
    if (insErr) {
      return NextResponse.json({ error: insErr.message }, { status: 500 });
    }

    await adminSb.from("admin_audit_log").insert({
      actor_auth_user_id: user.id,
      action: "support.reply",
      target_type: "chat",
      target_id: chatId,
      payload: { message_id: (msg as { id: string }).id },
    });

    return NextResponse.json({ ok: true, message: msg });
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
