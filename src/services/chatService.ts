"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import type { ChatListItem, ChatMessage, Profile } from "@/types";
import { MAX_RELATION_ROWS } from "@/services/constants";

export function formatChatListPreview(
  content: string | null | undefined,
): string | null {
  const s = (content ?? "").replace(/\s+/g, " ").trim();
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
  if (!memberRows?.length)
    return { chatMembership, items: [] };

  const chatIds = Array.from(new Set(memberRows.map((m) => (m as { chat_id: string }).chat_id)));
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
  const { data: lastRows, error: lastErr } = await supabase
    .from("messages")
    .select("chat_id, sender_id, created_at, content")
    .in(
      "chat_id",
      Array.from(new Set(baseItems.map((i) => i.chatId))),
    )
    .order("created_at", { ascending: false })
    .limit(Math.max(baseItems.length * 5, 100));

  if (!lastErr && lastRows) {
    for (const row of lastRows as {
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

export async function fetchChatMemberUserIds(
  chatId: string,
): Promise<{ user_id: string }[]> {
  const { data, error } = await supabase
    .from("chat_members")
    .select("user_id")
    .eq("chat_id", chatId);
  if (error || !data) return [];
  return data as { user_id: string }[];
}

async function resolvePrivateChatBetween(
  myProfileId: string,
  peerProfileId: string,
): Promise<string> {
  const { data: myMemberRows, error: myMemberErr } = await supabase
    .from("chat_members")
    .select("chat_id")
    .eq("user_id", myProfileId)
    .limit(MAX_RELATION_ROWS);
  if (myMemberErr) throw myMemberErr;

  const candidateChatIds = Array.from(
    new Set((myMemberRows ?? []).map((r: { chat_id: string }) => r.chat_id)),
  );

  if (candidateChatIds.length > 0) {
    const { data: sharedRows, error: sharedErr } = await supabase
      .from("chat_members")
      .select("chat_id")
      .eq("user_id", peerProfileId)
      .in("chat_id", candidateChatIds)
      .limit(1);
    if (sharedErr) throw sharedErr;
    const candidate = (sharedRows?.[0] as { chat_id?: string })?.chat_id;
    if (candidate) {
      const { data: oneChat, error: oneChatErr } = await supabase
        .from("chats")
        .select("id")
        .eq("id", candidate)
        .eq("is_group", false)
        .maybeSingle();
      if (oneChatErr) throw oneChatErr;
      const id = (oneChat as { id: string } | null)?.id;
      if (id) return id;
    }
  }

  const { data: newChat, error: createChatError } = await supabase
    .from("chats")
    .insert({
      is_group: false,
      title: null,
      created_by: myProfileId,
    })
    .select("id")
    .single();

  if (createChatError) throw createChatError;

  const chatId = (newChat as { id: string }).id;

  const { error: membersError } = await supabase.from("chat_members").insert([
    { chat_id: chatId, user_id: myProfileId },
    { chat_id: chatId, user_id: peerProfileId },
  ]);
  if (membersError) throw membersError;

  return chatId;
}

export async function openOrEnsurePrivateChat(
  myProfileId: string,
  peerProfileId: string,
): Promise<string> {
  return resolvePrivateChatBetween(myProfileId, peerProfileId);
}

export async function fetchRecentMessages(
  chatId: string,
  options: { excludeSenderIds?: string[] } = {},
): Promise<ChatMessage[]> {
  let q = supabase
    .from("messages")
    .select("id, content, sender_id, created_at, edited_at")
    .eq("chat_id", chatId);

  const ex = options.excludeSenderIds?.[0];
  if (ex) q = q.neq("sender_id", ex);

  const { data: msgsData, error: msgsError } = await q
    .order("created_at", { ascending: false })
    .limit(5);
  if (msgsError) throw msgsError;
  return ((msgsData ?? []) as ChatMessage[]).slice().reverse();
}

export async function updateMessageContent(
  messageId: string,
  content: string,
) {
  return supabase
    .from("messages")
    .update({ content })
    .eq("id", messageId)
    .select("id, content, sender_id, created_at, edited_at")
    .single();
}

export async function insertMessage(payload: {
  chatId: string;
  senderId: string;
  content: string;
}) {
  return supabase
    .from("messages")
    .insert({
      chat_id: payload.chatId,
      sender_id: payload.senderId,
      content: payload.content,
    })
    .select("id, content, sender_id, created_at, edited_at")
    .single();
}

type MessageRealtimePayload =
  | (ChatMessage & { chat_id?: string })
  | null
  | undefined;

export type MessagesRealtimeCallbacks = {
  /** INSERT событие сообщения (new row). */
  onInsert?: (payload: NonNullable<MessageRealtimePayload>) => void | Promise<void>;
  /** UPDATE событие сообщения. */
  onUpdate?: (payload: NonNullable<MessageRealtimePayload>) => void | Promise<void>;
};

/** Подписка на realtime messages (личные чаты). */
export function subscribeToMessagesRealtime(
  callbacks: MessagesRealtimeCallbacks,
): RealtimeChannel {
  const channel = supabase
    .channel("messages-realtime")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages" },
      (evt) =>
        callbacks.onInsert?.(evt.new as ChatMessage & { chat_id?: string }),
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "messages" },
      (evt) =>
        callbacks.onUpdate?.(evt.new as ChatMessage & { chat_id?: string }),
    );

  channel.subscribe();

  return channel;
}

export function unsubscribeChannel(ch: RealtimeChannel) {
  void supabase.removeChannel(ch);
}
