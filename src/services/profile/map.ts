"use client";

import { supabasePublic } from "@/lib/supabaseClient";
import type { Profile, ProfileWorkBlock } from "@/types";
import { profileInterestedInProfession } from "@/services/profile/match";

export const PROFILE_MAP_SELECT =
  "id, full_name, age, city, industry, subindustry, role_title, last_seen_at, content_updated_at, skills, resources, current_status, experience_years, interested_in, seeking, rating_avg, rating_count, is_pro, pro_expires_at, subscription_plan";

type ProfileMapRow = Profile & {
  profile_work?: ProfileWorkBlock[] | null;
};

function normalizeWorkBlocks(
  blocks: ProfileWorkBlock[] | null | undefined,
): ProfileWorkBlock[] {
  return (blocks ?? [])
    .slice()
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((block) => ({
      id: block.id,
      role_title: block.role_title ?? null,
      industry: block.industry ?? null,
      subindustry: block.subindustry ?? null,
      experience_years: block.experience_years ?? null,
      sort_order: block.sort_order ?? 0,
    }));
}

function normalizeMapProfile(row: ProfileMapRow): Profile {
  const { profile_work, ...rest } = row;
  return {
    ...rest,
    work_blocks: normalizeWorkBlocks(profile_work),
  };
}

/** Точки карты (locations). */
export type LocationPointRow = {
  id: string;
  user_id: string;
  lat: number;
  lng: number;
  city: string | null;
};

function mapLocationRow(row: LocationPointRow): LocationPointRow {
  return {
    id: row.id,
    user_id: row.user_id,
    lat: row.lat,
    lng: row.lng,
    city: row.city ?? null,
  };
}

export async function fetchActiveLocations(
  limit = 200,
  ownUserId?: string | null,
): Promise<LocationPointRow[]> {
  const { data, error } = await supabasePublic
    .from("locations")
    .select("id, user_id, lat, lng, city")
    .eq("is_active", true)
    .limit(limit);
  if (error || !data) return [];

  const rows = (data as LocationPointRow[]).map(mapLocationRow);
  const ownId = ownUserId?.trim();
  if (!ownId || rows.some((row) => row.user_id === ownId)) {
    return rows;
  }

  const { data: ownData, error: ownError } = await supabasePublic
    .from("locations")
    .select("id, user_id, lat, lng, city")
    .eq("is_active", true)
    .eq("user_id", ownId)
    .maybeSingle();

  if (ownError || !ownData) return rows;

  return [...rows, mapLocationRow(ownData as LocationPointRow)];
}

/** profiles.id с активным пином на карте (dedupe по user_id). */
export async function fetchActiveLocationUserIds(limit = 200): Promise<Set<string>> {
  const rows = await fetchActiveLocations(limit);
  return new Set(rows.map((row) => row.user_id));
}

export async function fetchProfilesForMap(limit = 50): Promise<Profile[]> {
  const pinnedUserIds = [...(await fetchActiveLocationUserIds(200))];
  if (pinnedUserIds.length === 0) return [];

  const select = `${PROFILE_MAP_SELECT}, profile_work(id, role_title, industry, subindustry, experience_years, sort_order)`;
  const { data, error } = await supabasePublic
    .from("profiles")
    .select(select)
    .in("id", pinnedUserIds)
    .is("deleted_at", null)
    .eq("map_visible", true)
    .limit(limit);

  if (error) throw error;
  return ((data ?? []) as ProfileMapRow[]).map(normalizeMapProfile);
}

export async function fetchProfileForMapById(id: string): Promise<Profile | null> {
  const profileId = id.trim();
  if (!profileId) return null;

  const select = `${PROFILE_MAP_SELECT}, profile_work(id, role_title, industry, subindustry, experience_years, sort_order)`;
  const { data, error } = await supabasePublic
    .from("profiles")
    .select(select)
    .eq("id", profileId)
    .is("deleted_at", null)
    .eq("map_visible", true)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return normalizeMapProfile(data as ProfileMapRow);
}

export async function fetchProfilesInterestedIn(
  roleTitle: string,
  options?: { excludeProfileId?: string; limit?: number },
): Promise<Profile[]> {
  const trimmed = roleTitle.trim();
  if (!trimmed) return [];

  const limit = options?.limit ?? 200;
  const { data, error } = await supabasePublic
    .from("profiles")
    .select(PROFILE_MAP_SELECT)
    .is("deleted_at", null)
    .eq("map_visible", true)
    .ilike("interested_in", `%${trimmed}%`)
    .limit(limit);

  if (error) throw error;

  let rows = ((data ?? []) as Profile[]).filter((profile) =>
    profileInterestedInProfession(profile, trimmed),
  );

  if (options?.excludeProfileId) {
    rows = rows.filter((profile) => profile.id !== options.excludeProfileId);
  }

  const pinnedUserIds = await fetchActiveLocationUserIds(200);
  rows = rows.filter((profile) => pinnedUserIds.has(profile.id));

  return rows;
}
