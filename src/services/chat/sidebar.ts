"use client";

import { supabase } from "@/lib/supabaseClient";
import type { ChatListItem, Profile } from "@/types";
import { profileSharePreviewText } from "@/lib/profileShare";
import { appealPreviewText } from "@/lib/support";

function chatPreviewText(content: string | null | undefined): string {
  const raw = content ?? "";
  if (raw.startsWith("__PROFILE_SHARE__")) {
    return profileSharePreviewText(raw);
  }
  return appealPreviewText(raw);
}

export function formatChatListPreview(
  content: string | null | undefined,
): string | null {
  const s = chatPreviewText(content).replace(/\s+/g, " ").trim();
  if (!s) return null;
  return s.length > 30 ? `${s.slice(0, 30)}...` : s;
}

/** Список чатов справа: участники и превью последнего сообщения. */
export async function loadPrivateChatSidebar(
  myProfileId: string,
  blockedProfileIds: string[],
): Promise<{ chatMembership: Set<string>; items: ChatListItem[] }> {
  const chatMembership = new Set<string>();

  const { data: memberRows, error: memberErr } = await supabase
    .from("chat_members")
    .select("chat_id")
    .eq("user_id", myProfileId);

  if (memberErr) throw memberErr;
  if (!memberRows?.length) return { chatMembership, items: [] };

  const chatIds = Array.from(
    new Set(memberRows.map((m) => (m as { chat_id: string }).chat_id)),
  );
  chatIds.forEach((id) => chatMembership.add(id));

  const { data: otherRows, error: otherErr } = await supabase
    .from("chat_members")
    .select(
      "chat_id, user_id, profiles(id, full_name, city, industry, subindustry, role_title, last_seen_at, skills, resources, interested_in, rating_avg, rating_count)",
    )
    .in("chat_id", chatIds)
    .neq("user_id", myProfileId);

  if (otherErr) throw otherErr;
  if (!otherRows?.length) return { chatMembership, items: [] };

  const map = new Map<string, { chatId: string; profile: Profile }>();
  (otherRows as unknown[]).forEach((row) => {
    const r = row as {
      chat_id: string;
      profiles: Profile | Profile[] | null;
    };
    const profRaw = r.profiles;
    const prof = Array.isArray(profRaw) ? profRaw[0] : profRaw;
    if (!prof) return;
    map.set(prof.id as string, {
      chatId: r.chat_id,
      profile: {
        id: prof.id,
        full_name: prof.full_name,
        city: prof.city,
        industry: prof.industry,
        subindustry: prof.subindustry,
        role_title: prof.role_title,
        last_seen_at: prof.last_seen_at ?? null,
        skills: prof.skills ?? null,
        resources: prof.resources ?? null,
        interested_in: prof.interested_in ?? null,
        rating_avg: prof.rating_avg,
        rating_count: prof.rating_count,
      },
    });
  });

  const baseItems: ChatListItem[] = Array.from(map.values()).map((v) => ({
    chatId: v.chatId,
    profile: v.profile,
    lastMessageAt: null,
    lastMessagePreview: null,
  }));

  const otherProfileIdByChatId = new Map<string, string>();
  baseItems.forEach((i) =>
    otherProfileIdByChatId.set(i.chatId, i.profile.id),
  );

  const lastByChat = new Map<string, { at: string; preview: string }>();
  const uniqueChatIds = Array.from(new Set(baseItems.map((i) => i.chatId)));
  const { data: lastRows, error: lastErr } = await supabase.rpc(
    "get_chat_last_messages",
    { p_chat_ids: uniqueChatIds },
  );

  if (!lastErr && lastRows) {
    for (const row of lastRows as {
      chat_id: string;
      sender_id: string;
      created_at: string | null;
      content: unknown;
    }[]) {
      const chatId = row.chat_id as string;
      const otherId = otherProfileIdByChatId.get(chatId);
      if (
        otherId &&
        blockedProfileIds.includes(otherId) &&
        row.sender_id === otherId
      ) {
        continue;
      }
      if (row.created_at) {
        lastByChat.set(chatId, {
          at: row.created_at as string,
          preview: String(row.content ?? "").trim(),
        });
      }
    }
  } else if (lastErr) {
    const code = String((lastErr as { code?: string }).code ?? "");
    const msg = String(lastErr.message ?? "");
    if (
      code !== "PGRST202" &&
      !msg.includes("get_chat_last_messages") &&
      !msg.includes("Could not find the function")
    ) {
      throw lastErr;
    }

    const { data: fallbackRows, error: fallbackErr } = await supabase
      .from("messages")
      .select("chat_id, sender_id, created_at, content")
      .in("chat_id", uniqueChatIds)
      .order("created_at", { ascending: false })
      .limit(Math.max(uniqueChatIds.length * 5, 100));

    if (!fallbackErr && fallbackRows) {
      for (const row of fallbackRows as {
        chat_id: string;
        sender_id: string;
        created_at: string | null;
        content: unknown;
      }[]) {
        const chatId = row.chat_id as string;
        if (lastByChat.has(chatId)) continue;
        const otherId = otherProfileIdByChatId.get(chatId);
        if (
          otherId &&
          blockedProfileIds.includes(otherId) &&
          row.sender_id === otherId
        ) {
          continue;
        }
        if (row.created_at) {
          lastByChat.set(chatId, {
            at: row.created_at as string,
            preview: String(row.content ?? "").trim(),
          });
        }
      }
    }
  }

  const withLast = baseItems
    .map((i) => {
      const last = lastByChat.get(i.chatId);
      return {
        ...i,
        lastMessageAt: last?.at ?? null,
        lastMessagePreview: last?.preview ? last.preview : null,
      };
    })
    .sort((a, b) => {
      const at = a.lastMessageAt ?? "";
      const bt = b.lastMessageAt ?? "";
      return bt.localeCompare(at);
    });

  return { chatMembership, items: withLast };
}

/** Непрочитанные ЛС по profile id собеседника (нужна миграция 2026-05-26-chat-members-last-read.sql). */
export async function loadDmUnreadCounts(
  myProfileId: string,
  blockedProfileIds: string[],
): Promise<Record<string, number>> {
  const { data, error } = await supabase.rpc("get_dm_unread_counts", {
    p_profile_id: myProfileId,
  });

  if (error) {
    const code = String((error as { code?: string }).code ?? "");
    const msg = String(error.message ?? "");
    if (
      code === "PGRST202" ||
      msg.includes("get_dm_unread_counts") ||
      msg.includes("Could not find the function")
    ) {
      return {};
    }
    throw error;
  }

  const out: Record<string, number> = {};
  for (const row of data ?? []) {
    const peer = (row as { peer_profile_id?: string }).peer_profile_id;
    const count = Number((row as { unread_count?: number }).unread_count ?? 0);
    if (!peer || count <= 0) continue;
    if (blockedProfileIds.includes(peer)) continue;
    out[peer] = count;
  }
  return out;
}

/** Отметить чат прочитанным для текущего участника. */
export async function markChatAsRead(
  chatId: string,
  myProfileId: string,
): Promise<void> {
  const { error } = await supabase
    .from("chat_members")
    .update({ last_read_at: new Date().toISOString() })
    .eq("chat_id", chatId)
    .eq("user_id", myProfileId);

  if (error) {
    const msg = String(error.message ?? "");
    const code = String((error as { code?: string }).code ?? "");
    if (
      code === "42703" ||
      (msg.includes("last_read_at") &&
        (/does not exist/i.test(msg) || /не существует/i.test(msg)))
    ) {
      return;
    }
    throw error;
  }
}
