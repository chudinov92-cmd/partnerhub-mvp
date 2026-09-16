"use client";

import { supabase } from "@/lib/supabaseClient";
import type { Profile } from "@/types";
import {
  SUPPORT_AUTH_USER_ID,
  getSupportProfileIdFromEnv,
} from "@/lib/support";

let cachedSupportProfileId: string | null | undefined;

export async function getSupportProfileId(): Promise<string> {
  const fromEnv = getSupportProfileIdFromEnv();
  if (fromEnv) return fromEnv;
  if (cachedSupportProfileId) return cachedSupportProfileId;

  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("auth_user_id", SUPPORT_AUTH_USER_ID)
    .maybeSingle();
  if (error) throw error;
  const id = (data as { id?: string } | null)?.id;
  if (!id) {
    throw new Error(
      "Профиль поддержки не найден. Выполните SQL 2026-05-21-support.sql и задайте NEXT_PUBLIC_SUPPORT_PROFILE_ID.",
    );
  }
  cachedSupportProfileId = id;
  return id;
}

export async function fetchSupportProfile(): Promise<Profile> {
  const supportId = await getSupportProfileId();
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, full_name, city, industry, subindustry, role_title, last_seen_at, skills, resources, interested_in, rating_avg, rating_count",
    )
    .eq("id", supportId)
    .maybeSingle();
  if (error) throw error;
  const row = data as Profile | null;
  if (!row) {
    return {
      id: supportId,
      full_name: "Поддержка",
      city: null,
      rating_avg: null,
      rating_count: null,
    };
  }
  return {
    id: row.id,
    full_name: row.full_name ?? "Поддержка",
    city: row.city,
    industry: row.industry,
    subindustry: row.subindustry,
    role_title: row.role_title,
    last_seen_at: row.last_seen_at ?? null,
    skills: row.skills ?? null,
    resources: row.resources ?? null,
    interested_in: row.interested_in ?? null,
    rating_avg: row.rating_avg,
    rating_count: row.rating_count,
  };
}

export async function isChatClosed(chatId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("chats")
    .select("is_closed")
    .eq("id", chatId)
    .maybeSingle();
  if (error) {
    const msg = String(error.message ?? "");
    const code = String((error as { code?: string }).code ?? "");
    // Миграция 2026-05-21-support.sql ещё не применена — не ломаем открытие чата
    if (
      code === "42703" ||
      (msg.includes("is_closed") &&
        (/does not exist/i.test(msg) || /не существует/i.test(msg)))
    ) {
      return false;
    }
    throw error;
  }
  return Boolean((data as { is_closed?: boolean } | null)?.is_closed);
}

export async function reopenChat(chatId: string): Promise<void> {
  const { error } = await supabase.rpc("reopen_support_chat", {
    p_chat_id: chatId,
  });
  if (error) throw error;
}
