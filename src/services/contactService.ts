"use client";

import { supabase } from "@/lib/supabaseClient";
import { MAX_RELATION_ROWS } from "@/services/constants";
import type { Profile } from "@/types";

export async function fetchContactProfileIds(ownerId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("profile_contacts")
    .select("contact_profile_id")
    .eq("owner_id", ownerId)
    .limit(MAX_RELATION_ROWS);
  if (error) throw error;
  return (data as { contact_profile_id: string }[] | null)?.map(
    (r) => r.contact_profile_id,
  ) ?? [];
}

export async function fetchViewedProfileStates(
  viewerId: string,
): Promise<Record<string, string>> {
  const { data, error } = await supabase
    .from("profile_views")
    .select("viewed_profile_id, viewed_content_updated_at")
    .eq("viewer_id", viewerId)
    .limit(MAX_RELATION_ROWS);
  if (error) throw error;

  const rows =
    (data as
      | { viewed_profile_id: string; viewed_content_updated_at: string }[]
      | null) ?? [];

  return Object.fromEntries(
    rows.map((r) => [r.viewed_profile_id, r.viewed_content_updated_at]),
  );
}

/** Пин «просмотрен», если пользователь видел актуальную версию контента профиля. */
export function getEffectiveViewedProfileIds(
  viewedStates: Record<string, string>,
  profiles: Pick<Profile, "id" | "content_updated_at">[],
): string[] {
  const byId = new Map(profiles.map((p) => [p.id, p]));

  return Object.entries(viewedStates)
    .filter(([id, viewedAt]) => {
      const profile = byId.get(id);
      if (!profile?.content_updated_at) return true;
      return viewedAt >= profile.content_updated_at;
    })
    .map(([id]) => id);
}

export async function fetchBlockedProfileIds(ownerId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("profile_blocks")
    .select("blocked_profile_id")
    .eq("owner_id", ownerId)
    .limit(MAX_RELATION_ROWS);
  if (error) throw error;
  return (data as { blocked_profile_id: string }[] | null)?.map(
    (r) => r.blocked_profile_id,
  ) ?? [];
}

export async function deleteContact(ownerId: string, contactProfileId: string) {
  const { error } = await supabase
    .from("profile_contacts")
    .delete()
    .eq("owner_id", ownerId)
    .eq("contact_profile_id", contactProfileId);
  if (error) throw error;
}

export async function insertContact(ownerId: string, contactProfileId: string) {
  const { error } = await supabase.from("profile_contacts").insert({
    owner_id: ownerId,
    contact_profile_id: contactProfileId,
  });
  if (error) throw error;
}

export async function deleteBlock(ownerId: string, blockedProfileId: string) {
  const { error } = await supabase
    .from("profile_blocks")
    .delete()
    .eq("owner_id", ownerId)
    .eq("blocked_profile_id", blockedProfileId);
  if (error) throw error;
}

export async function insertBlock(ownerId: string, blockedProfileId: string) {
  const { error } = await supabase.from("profile_blocks").insert({
    owner_id: ownerId,
    blocked_profile_id: blockedProfileId,
  });
  if (error) throw error;
}

export async function upsertProfileView(
  viewerId: string,
  viewedProfileId: string,
  viewedContentUpdatedAt: string,
) {
  const { error } = await supabase.from("profile_views").upsert(
    {
      viewer_id: viewerId,
      viewed_profile_id: viewedProfileId,
      viewed_content_updated_at: viewedContentUpdatedAt,
    },
    { onConflict: "viewer_id,viewed_profile_id" },
  );
  if (error) throw error;
}
