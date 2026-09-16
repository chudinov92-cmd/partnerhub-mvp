"use client";

import { supabase } from "@/lib/supabaseClient";
import { getSupportProfileIdFromEnv } from "@/lib/support";
import { getSupportProfileId } from "@/services/chat/support";

/** Начало текущих суток по Москве (UTC instant для фильтра created_at). */
function startOfTodayMskIso(): string {
  const mskOffsetMs = 3 * 60 * 60 * 1000;
  const mskNow = new Date(Date.now() + mskOffsetMs);
  const y = mskNow.getUTCFullYear();
  const m = mskNow.getUTCMonth();
  const d = mskNow.getUTCDate();
  const midnightMskAsUtc = Date.UTC(y, m, d, 0, 0, 0, 0);
  return new Date(midnightMskAsUtc - mskOffsetMs).toISOString();
}

/**
 * Уникальные собеседники, которым текущий пользователь отправил сообщение с начала суток (МСК).
 */
export async function getUniqueChatPartnersToday(
  myProfileId: string,
): Promise<Set<string>> {
  const since = startOfTodayMskIso();
  const { data: msgs, error } = await supabase
    .from("messages")
    .select("chat_id")
    .eq("sender_id", myProfileId)
    .gte("created_at", since);

  if (error) throw error;

  const chatIds = Array.from(
    new Set(
      (msgs ?? [])
        .map((row) => (row as { chat_id: string }).chat_id)
        .filter(Boolean),
    ),
  );

  if (chatIds.length === 0) return new Set();

  let supportProfileId: string | null = null;
  try {
    supportProfileId = await getSupportProfileId();
  } catch {
    supportProfileId = getSupportProfileIdFromEnv();
  }

  const { data: members, error: membersErr } = await supabase
    .from("chat_members")
    .select("chat_id, user_id")
    .in("chat_id", chatIds);

  if (membersErr) throw membersErr;

  const peers = new Set<string>();
  for (const row of members ?? []) {
    const member = row as { chat_id: string; user_id: string };
    if (member.user_id === myProfileId) continue;
    if (member.user_id === supportProfileId) continue;
    peers.add(member.user_id);
  }

  return peers;
}
