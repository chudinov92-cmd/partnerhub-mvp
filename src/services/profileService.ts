"use client";

import { supabase } from "@/lib/supabaseClient";
import type { Profile } from "@/types";

export async function fetchProfilesForMap(limit = 50): Promise<Profile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, full_name, age, city, industry, subindustry, role_title, last_seen_at, skills, resources, current_status, experience_years, interested_in, rating_avg, rating_count",
    )
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as Profile[];
}

export type CurrentProfileRow = {
  id: string;
  full_name: string | null;
  city: string | null;
  is_blocked: boolean | null;
};

export async function fetchCurrentUserProfileRow(
  authUserId: string,
): Promise<CurrentProfileRow | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, city, is_blocked")
    .eq("auth_user_id", authUserId)
    .maybeSingle();
  if (error) throw error;
  return (data as CurrentProfileRow | null) ?? null;
}

export async function updateProfileLastSeen(profileId: string): Promise<void> {
  await supabase
    .from("profiles")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", profileId);
}

export async function countContactsForOwner(profileId: string): Promise<number> {
  const { count, error } = await supabase
    .from("profile_contacts")
    .select("contact_profile_id", { count: "exact", head: true })
    .eq("owner_id", profileId);
  if (error) throw error;
  return count ?? 0;
}

export async function fetchTopBarProfile(
  authUserId: string,
): Promise<{ id: string; full_name: string | null } | null> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("auth_user_id", authUserId)
    .maybeSingle();
  const p = profile as { id: string; full_name: string | null } | null;
  return p;
}

/** Точки карты (locations). */
export type LocationPointRow = {
  id: string;
  user_id: string;
  lat: number;
  lng: number;
  city: string | null;
};

export async function fetchActiveLocations(
  limit = 200,
): Promise<LocationPointRow[]> {
  const { data, error } = await supabase
    .from("locations")
    .select("id, user_id, lat, lng, city")
    .eq("is_active", true)
    .limit(limit);
  if (error || !data) return [];
  return (data as LocationPointRow[]).map((row) => ({
    id: row.id,
    user_id: row.user_id,
    lat: row.lat,
    lng: row.lng,
    city: row.city ?? null,
  }));
}

/** Лайки на карточке профиля (ProfilePreviewCard). */
export async function fetchProfileLikeCount(targetProfileId: string): Promise<number> {
  const { count, error } = await supabase
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
