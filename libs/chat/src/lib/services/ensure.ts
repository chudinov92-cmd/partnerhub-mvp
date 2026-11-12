"use client";

import { supabase } from "@my-startup/auth";

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

/**
 * Создание/поиск чата через RPC (обходит RLS на INSERT).
 * Пробрасывает ошибку RPC, в т.ч. raise exception 'blocked' после M6.
 * Возвращает chat_id (uuid) или кидает исключение.
 */
async function ensurePrivateChatViaRpc(
  peerProfileId: string,
): Promise<string> {
  const { data, error } = await supabase.rpc("ensure_private_chat", {
    p_peer_profile_id: peerProfileId,
  });
  if (error) {
    throw error;
  }
  const chatId = data as string | null;
  if (!chatId || String(chatId).length === 0) {
    throw new Error("ensure_private_chat: RPC вернул пустой chatId");
  }
  return String(chatId);
}

export async function openOrEnsurePrivateChat(
  myProfileId: string,
  peerProfileId: string,
): Promise<string> {
  return ensurePrivateChatViaRpc(peerProfileId);
}