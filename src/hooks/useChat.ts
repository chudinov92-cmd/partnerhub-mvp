"use client";

import { useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import {
  subscribeToMessagesRealtime,
  unsubscribeChannel,
  fetchChatMemberUserIds,
} from "@/services/chatService";
import type { ChatMessage, ChatListItem, CurrentUser } from "@/types";

/** Realtime-канал сообщений для личных чатов. */
export function useChatMessagesRealtime(opts: {
  currentUser: CurrentUser | null;
  activeChatId: string | null;
  blockedProfileIds: readonly string[];
  chatMembershipRef: MutableRefObject<Set<string>>;
  setChatMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  setUnreadByUser: Dispatch<SetStateAction<Record<string, number>>>;
  setChatList: Dispatch<SetStateAction<ChatListItem[]>>;
}) {
  const {
    currentUser,
    activeChatId,
    blockedProfileIds,
    chatMembershipRef,
    setChatMessages,
    setUnreadByUser,
    setChatList,
  } = opts;

  useEffect(() => {
    if (!currentUser) return;

    const resolveMembersForChat = async (
      chatId: string,
      senderId: string,
    ): Promise<{ user_id: string }[] | null> => {
      if (chatMembershipRef.current.has(chatId)) {
        return [{ user_id: currentUser.profileId }, { user_id: senderId }];
      }
      const data = await fetchChatMemberUserIds(chatId);
      if (!data.length) return null;
      if (data.some((m) => m.user_id === currentUser.profileId)) {
        chatMembershipRef.current.add(chatId);
      }
      return data;
    };

    const channel = subscribeToMessagesRealtime({
      onInsert: async (payload) => {
        const msg = payload as ChatMessage & { chat_id?: string };

        if (msg.sender_id === currentUser.profileId) return;
        if (blockedProfileIds.includes(msg.sender_id)) return;

        try {
          const chatId = (msg as { chat_id?: string }).chat_id as string;
          const members = await resolveMembersForChat(chatId, msg.sender_id);
          if (!members) return;

          const memberIds = members.map((m) => m.user_id as string);
          if (!memberIds.includes(currentUser.profileId)) return;

          const otherId =
            memberIds.find((id) => id !== currentUser.profileId) ??
            currentUser.profileId;

          if (activeChatId === chatId) {
            setChatMessages((prev) => [...prev, msg]);
          } else {
            setUnreadByUser((prev) => ({
              ...prev,
              [otherId]: (prev[otherId] || 0) + 1,
            }));
          }

          setChatList((prev) => {
            const idx = prev.findIndex((x) => x.chatId === chatId);
            if (idx < 0) return prev;
            const next = [...prev];
            const item = {
              ...next[idx],
              lastMessageAt: msg.created_at,
              lastMessagePreview: String(msg.content ?? "").trim(),
            };
            next.splice(idx, 1);
            return [item, ...next];
          });
        } catch {
          //
        }
      },
      onUpdate: async (payload) => {
        const msg = payload as ChatMessage & { chat_id?: string };

        if (blockedProfileIds.includes(msg.sender_id)) return;

        try {
          const chatId = (msg as { chat_id?: string }).chat_id as string;
          const members = await resolveMembersForChat(chatId, msg.sender_id);
          if (!members) return;

          const memberIds = members.map((m) => m.user_id as string);
          if (!memberIds.includes(currentUser.profileId)) return;

          if (activeChatId === chatId) {
            setChatMessages((prev) =>
              prev.map((m) => (m.id === msg.id ? msg : m)),
            );
          }

          setChatList((prev) => {
            const idx = prev.findIndex((x) => x.chatId === chatId);
            if (idx < 0) return prev;
            const next = [...prev];
            const item = {
              ...next[idx],
              lastMessagePreview: String(msg.content ?? "").trim(),
            };
            next[idx] = item;
            return next;
          });
        } catch {
          //
        }
      },
    });

    return () => {
      unsubscribeChannel(channel);
    };
  }, [
    currentUser,
    activeChatId,
    blockedProfileIds,
    chatMembershipRef,
    setChatMessages,
    setUnreadByUser,
    setChatList,
  ]);
}
