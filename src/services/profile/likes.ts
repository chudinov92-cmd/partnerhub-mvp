"use client";

import { supabase, supabasePublic } from "@/lib/supabaseClient";

/** Лайки на карточке профиля (ProfilePreviewCard). */
export async function fetchProfileLikeCount(targetProfileId: string): Promise<number> {
  const { count, error } = await supabasePublic
    .from("profile_likes")
    .select("id", { count: "exact", head: true })
    .eq("liked_profile_id", targetProfileId);
  if (error) throw error;
  return count ?? 0;
}

export async function fetchViewerHasLiked(
  likedProfileId: string,
  likerProfileId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("profile_likes")
    .select("id")
    .eq("liked_profile_id", likedProfileId)
    .eq("liker_profile_id", likerProfileId)
    .limit(1);
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

export async function removeProfileLike(
  likerProfileId: string,
  likedProfileId: string,
): Promise<void> {
  const { error } = await supabase
    .from("profile_likes")
    .delete()
    .eq("liker_profile_id", likerProfileId)
    .eq("liked_profile_id", likedProfileId);
  if (error) throw error;
}

export async function insertProfileLike(
  likerProfileId: string,
  likedProfileId: string,
): Promise<void> {
  const { error } = await supabase.from("profile_likes").insert({
    liker_profile_id: likerProfileId,
    liked_profile_id: likedProfileId,
  });
  if (error) throw error;
}

export async function resolveProfileShareCode(code: string): Promise<string | null> {
  const { data, error } = await supabasePublic.rpc("resolve_profile_share_code", {
    p_code: code,
  });
  if (error || data == null) return null;
  return String(data);
}
