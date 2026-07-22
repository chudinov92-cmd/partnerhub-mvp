"use client";

import { supabase, supabasePublic } from "@/lib/supabaseClient";
import type { Profile, ProfileWorkBlock } from "@/types";

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

export function getProfessionMatchIndex(
  profile: Pick<Profile, "role_title" | "work_blocks">,
  profession: string,
): number | null {
  const target = profession.trim();
  if (!target) return null;

  if ((profile.role_title ?? "").trim() === target) return 0;

  const extras = profile.work_blocks ?? [];
  for (let i = 0; i < extras.length; i++) {
    if ((extras[i].role_title ?? "").trim() === target) return i + 1;
  }
  return null;
}

export function profileMatchesProfession(
  profile: Pick<Profile, "role_title" | "work_blocks">,
  profession: string,
): boolean {
  return getProfessionMatchIndex(profile, profession) !== null;
}

export async function fetchProfilesForMap(limit = 50): Promise<Profile[]> {
  const select = `${PROFILE_MAP_SELECT}, profile_work(id, role_title, industry, subindustry, experience_years, sort_order)`;
  const withFilters = await supabasePublic
    .from("profiles")
    .select(select)
    .is("deleted_at", null)
    .eq("map_visible", true)
    .limit(limit);

  if (!withFilters.error) {
    return ((withFilters.data ?? []) as ProfileMapRow[]).map(normalizeMapProfile);
  }

  // До миграции 2026-07-21-account-settings.sql колонок ещё нет.
  const msg = String(withFilters.error.message ?? "");
  if (!/deleted_at|map_visible|column/i.test(msg)) {
    throw withFilters.error;
  }

  const { data, error } = await supabasePublic
    .from("profiles")
    .select(select)
    .limit(limit);
  if (error) throw error;
  return ((data ?? []) as ProfileMapRow[]).map(normalizeMapProfile);
}

const PROFILE_MAP_SELECT =
  "id, full_name, age, city, industry, subindustry, role_title, last_seen_at, content_updated_at, skills, resources, current_status, experience_years, interested_in, rating_avg, rating_count, is_pro, pro_expires_at";

export type CurrentProfileRow = {
  id: string;
  full_name: string | null;
  city: string | null;
  role_title: string | null;
  is_blocked: boolean | null;
  is_pro?: boolean | null;
  pro_expires_at?: string | null;
  map_visible?: boolean | null;
  deleted_at?: string | null;
};

export function parseInterestedProfessions(raw: string | null | undefined) {
  if (!raw) return [];
  return raw
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter(Boolean);
}

export function profileInterestedInProfession(
  profile: Pick<Profile, "interested_in">,
  profession: string,
) {
  const target = profession.trim();
  if (!target) return false;
  return parseInterestedProfessions(profile.interested_in).includes(target);
}

export async function fetchCurrentUserProfileRow(
  authUserId: string,
): Promise<CurrentProfileRow | null> {
  // Без .is("deleted_at", null): после soft delete auth_user_id = null,
  // а до миграции фильтр по несуществующей колонке ломает TopBar/settings.
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, full_name, city, role_title, is_blocked, is_pro, pro_expires_at, map_visible, deleted_at",
    )
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (error) {
    // Колонки map_visible/deleted_at ещё не накатаны — fallback без них.
    const msg = String(error.message ?? "");
    if (/map_visible|deleted_at|column/i.test(msg)) {
      const { data: fallback, error: fbErr } = await supabase
        .from("profiles")
        .select("id, full_name, city, role_title, is_blocked, is_pro, pro_expires_at")
        .eq("auth_user_id", authUserId)
        .maybeSingle();
      if (fbErr) throw fbErr;
      return (fallback as CurrentProfileRow | null) ?? null;
    }
    throw error;
  }
  const row = data as CurrentProfileRow | null;
  if (row?.deleted_at) return null;
  return row;
}

export async function fetchProfilesInterestedIn(
  roleTitle: string,
  options?: { excludeProfileId?: string; limit?: number },
): Promise<Profile[]> {
  const trimmed = roleTitle.trim();
  if (!trimmed) return [];

  const limit = options?.limit ?? 200;
  const withFilters = await supabasePublic
    .from("profiles")
    .select(PROFILE_MAP_SELECT)
    .is("deleted_at", null)
    .eq("map_visible", true)
    .ilike("interested_in", `%${trimmed}%`)
    .limit(limit);

  let rawRows: Profile[];
  if (!withFilters.error) {
    rawRows = (withFilters.data ?? []) as Profile[];
  } else {
    const msg = String(withFilters.error.message ?? "");
    if (!/deleted_at|map_visible|column/i.test(msg)) {
      throw withFilters.error;
    }
    const { data, error } = await supabasePublic
      .from("profiles")
      .select(PROFILE_MAP_SELECT)
      .ilike("interested_in", `%${trimmed}%`)
      .limit(limit);
    if (error) throw error;
    rawRows = (data ?? []) as Profile[];
  }

  let rows = rawRows.filter((profile) =>
    profileInterestedInProfession(profile, trimmed),
  );

  if (options?.excludeProfileId) {
    rows = rows.filter((profile) => profile.id !== options.excludeProfileId);
  }

  return rows;
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
): Promise<{ id: string; full_name: string | null; city: string | null } | null> {
  // Не фильтруем deleted_at в SQL: до миграции колонки нет → запрос падает и TopBar
  // показывает «Профиль». После soft delete auth_user_id = null — запись всё равно не найдётся.
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, full_name, city")
    .eq("auth_user_id", authUserId)
    .maybeSingle();
  if (error) throw error;
  return (profile as { id: string; full_name: string | null; city: string | null } | null) ?? null;
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
  const { data, error } = await supabasePublic
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

/** Вкл/выкл видимость на карте: profiles.map_visible + locations.is_active. */
export async function setProfileMapVisible(
  profileId: string,
  visible: boolean,
): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ map_visible: visible })
    .eq("id", profileId);
  if (error) {
    const msg = String(error.message ?? "");
    if (/map_visible|column/i.test(msg)) {
      throw new Error(
        "Миграция видимости на карте ещё не применена. Выполните 2026-07-21-account-settings.sql",
      );
    }
    throw error;
  }

  const { error: locErr } = await supabase
    .from("locations")
    .update({ is_active: visible })
    .eq("user_id", profileId);
  if (locErr) throw locErr;
}

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
