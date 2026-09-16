"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import type { ChatMessage } from "@/types";

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

export async function deleteMessage(messageId: string) {
  const { data, error } = await supabase
    .from("messages")
    .delete()
    .eq("id", messageId)
    .select("id");
  if (error) return { data: null, error };
  if (!data?.length) {
    return {
      data: null,
      error: new Error("Не удалось удалить сообщение."),
    };
  }
  return { data, error: null };
}

/** Последнее сообщение чата — для превью в списке после удаления. */
export async function fetchLatestMessageMeta(
  chatId: string,
): Promise<{ at: string; preview: string } | null> {
  const { data, error } = await supabase
    .from("messages")
    .select("created_at, content")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  const at = (data as { created_at?: string | null }).created_at;
  if (!at) return null;
  return {
    at,
    preview: String((data as { content?: unknown }).content ?? "").trim(),
  };
}

export async function insertMessage(payload: {
  chatId: string;
  senderId: string;
  content: string;
}) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  let token = session?.access_token ?? null;

  if (!token) {
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user) {
      return {
        data: null,
        error: new Error("Нужно войти в аккаунт"),
      };
    }
    const refreshed = await supabase.auth.getSession();
    token = refreshed.data.session?.access_token ?? null;
  }

  if (!token) {
    return {
      data: null,
      error: new Error("Сессия истекла. Обновите страницу или войдите снова."),
    };
  }

  try {
    const res = await fetch("/api/chat/send-message", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      credentials: "same-origin",
      body: JSON.stringify({
        chat_id: payload.chatId,
        content: payload.content,
      }),
    });

    const json = (await res.json()) as {
      message?: ChatMessage;
      error?: string;
    };

    if (!res.ok) {
      return {
        data: null,
        error: new Error(json.error ?? "Не удалось отправить сообщение"),
      };
    }

    return {
      data: json.message ?? null,
      error: null,
    };
  } catch (e) {
    return {
      data: null,
      error: e instanceof Error ? e : new Error("Не удалось отправить сообщение"),
    };
  }
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
  /** DELETE: payload = old row (нужен replica identity full). */
  onDelete?: (payload: NonNullable<MessageRealtimePayload>) => void | Promise<void>;
};

function buildMessagesChatFilter(chatIds: string[]): string | undefined {
  if (chatIds.length === 0) return undefined;
  return `chat_id=in.(${chatIds.join(",")})`;
}

/** Подписка на realtime messages (личные чаты). */
export function subscribeToMessagesRealtime(
  callbacks: MessagesRealtimeCallbacks,
  options?: { chatIds?: string[] },
): RealtimeChannel {
  const chatIds = options?.chatIds ?? [];
  const filter = buildMessagesChatFilter(chatIds);
  const channelName = `messages-realtime-${chatIds.length}`;

  const changeConfig = (event: "INSERT" | "UPDATE" | "DELETE") => ({
    event,
    schema: "public" as const,
    table: "messages" as const,
    ...(filter ? { filter } : {}),
  });

  const channel = supabase
    .channel(channelName)
    .on(
      "postgres_changes",
      changeConfig("INSERT"),
      (evt) =>
        callbacks.onInsert?.(evt.new as ChatMessage & { chat_id?: string }),
    )
    .on(
      "postgres_changes",
      changeConfig("UPDATE"),
      (evt) =>
        callbacks.onUpdate?.(evt.new as ChatMessage & { chat_id?: string }),
    )
    .on(
      "postgres_changes",
      changeConfig("DELETE"),
      (evt) =>
        callbacks.onDelete?.(evt.old as ChatMessage & { chat_id?: string }),
    );

  channel.subscribe();

  return channel;
}

export function unsubscribeChannel(ch: RealtimeChannel) {
  void supabase.removeChannel(ch);
}
