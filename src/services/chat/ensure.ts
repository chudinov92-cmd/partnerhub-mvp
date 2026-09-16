"use client";

import { supabase } from "@/lib/supabaseClient";
import { MAX_RELATION_ROWS } from "@/services/constants";

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

/** Создание/поиск чата через RPC (обходит RLS на INSERT). */
async function ensurePrivateChatViaRpc(
  peerProfileId: string,
): Promise<string | null> {
  const { data, error } = await supabase.rpc("ensure_private_chat", {
    p_peer_profile_id: peerProfileId,
  });
  if (error) {
    const msg = String(error.message ?? "");
    if (
      msg.includes("Could not find the function") ||
      msg.includes("ensure_private_chat") ||
      error.code === "PGRST202"
    ) {
      return null;
    }
    throw error;
  }
  const chatId = data as string | null;
  return chatId && String(chatId).length > 0 ? String(chatId) : null;
}

export async function openOrEnsurePrivateChat(
  myProfileId: string,
  peerProfileId: string,
): Promise<string> {
  const viaRpc = await ensurePrivateChatViaRpc(peerProfileId);
  if (viaRpc) return viaRpc;
  return resolvePrivateChatBetween(myProfileId, peerProfileId);
}
