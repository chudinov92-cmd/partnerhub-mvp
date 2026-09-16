import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabaseServer";
import { requireMinRole } from "@/app/api/admin/_lib/requireAdmin";
import { resolveSupportProfileId } from "@/app/api/admin/support/_lib/supportProfile";
import { appealPreviewText } from "@/lib/support";
import { jsonRouteError } from "@/app/api/_lib/jsonRouteError";

export type AdminSupportChatRow = {
  chatId: string;
  isClosed: boolean;
  userProfileId: string;
  userFullName: string | null;
  userCity: string | null;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
};

/** Список чатов поддержки или сообщения одного чата (?chatId=). */
export async function GET(req: Request) {
  try {
    const auth = await requireMinRole("support");
    if (!auth.ok) return auth.response;

    const adminSb = createSupabaseAdminClient();
    const supportId = await resolveSupportProfileId(adminSb);
    const url = new URL(req.url);
    const chatId = url.searchParams.get("chatId");

    if (chatId) {
      const { data: msgs, error: msgErr } = await adminSb
        .from("messages")
        .select("id, content, sender_id, created_at, edited_at")
        .eq("chat_id", chatId)
        .order("created_at", { ascending: true })
        .limit(500);
      if (msgErr) {
        return NextResponse.json({ error: msgErr.message }, { status: 500 });
      }

      const { data: chatRow, error: chatErr } = await adminSb
        .from("chats")
        .select("is_closed")
        .eq("id", chatId)
        .maybeSingle();
      if (chatErr) {
        return NextResponse.json({ error: chatErr.message }, { status: 500 });
      }

      return NextResponse.json({
        messages: msgs ?? [],
        isClosed: Boolean((chatRow as { is_closed?: boolean } | null)?.is_closed),
        supportProfileId: supportId,
      });
    }

    const { data: memberRows, error: memErr } = await adminSb
      .from("chat_members")
      .select("chat_id")
      .eq("user_id", supportId);
    if (memErr) {
      return NextResponse.json({ error: memErr.message }, { status: 500 });
    }

    const chatIds = Array.from(
      new Set((memberRows ?? []).map((r) => (r as { chat_id: string }).chat_id)),
    );

    const items: AdminSupportChatRow[] = [];

    for (const cid of chatIds) {
      const { data: peers, error: peerErr } = await adminSb
        .from("chat_members")
        .select("user_id, profiles(id, full_name, city)")
        .eq("chat_id", cid)
        .neq("user_id", supportId);
      if (peerErr) continue;
      const peerRaw = (peers ?? [])[0] as {
        user_id: string;
        profiles: { id: string; full_name: string | null; city: string | null } | { id: string; full_name: string | null; city: string | null }[] | null;
      } | undefined;
      const prof = Array.isArray(peerRaw?.profiles)
        ? peerRaw.profiles[0]
        : peerRaw?.profiles;

      const { data: chatMeta } = await adminSb
        .from("chats")
        .select("is_closed")
        .eq("id", cid)
        .maybeSingle();

      const { data: lastMsg } = await adminSb
        .from("messages")
        .select("created_at, content")
        .eq("chat_id", cid)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const last = lastMsg as { created_at?: string; content?: string } | null;

      items.push({
        chatId: cid,
        isClosed: Boolean((chatMeta as { is_closed?: boolean } | null)?.is_closed),
        userProfileId: prof?.id ?? peerRaw?.user_id ?? "",
        userFullName: prof?.full_name ?? null,
        userCity: prof?.city ?? null,
        lastMessageAt: last?.created_at ?? null,
        lastMessagePreview: last?.content
          ? appealPreviewText(String(last.content))
          : null,
      });
    }

    items.sort((a, b) =>
      (b.lastMessageAt ?? "").localeCompare(a.lastMessageAt ?? ""),
    );

    return NextResponse.json({ chats: items, supportProfileId: supportId });
  } catch (e: unknown) {
    return jsonRouteError("[admin/support GET]", e);
  }
}
