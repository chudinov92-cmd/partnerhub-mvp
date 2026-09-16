"use client";

import { supabase } from "@/lib/supabaseClient";

export type CurrentProfileRow = {
  id: string;
  full_name: string | null;
  city: string | null;
  role_title: string | null;
  is_blocked: boolean | null;
  is_pro?: boolean | null;
  pro_expires_at?: string | null;
  trial_used?: boolean | null;
  subscription_plan?: "free" | "pro" | "pro_plus" | null;
  map_visible?: boolean | null;
  deleted_at?: string | null;
  onboarding_completed?: boolean | null;
  onboarding_step?: number | null;
};

export type TopBarProfileRow = {
  id: string;
  full_name: string | null;
  city: string | null;
  is_pro?: boolean | null;
  pro_expires_at?: string | null;
  subscription_plan?: "free" | "pro" | "pro_plus" | null;
};

export async function fetchCurrentUserProfileRow(
  authUserId: string,
): Promise<CurrentProfileRow | null> {
  // Без .is("deleted_at", null): после soft delete auth_user_id = null.
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, full_name, city, role_title, is_blocked, is_pro, pro_expires_at, trial_used, subscription_plan, map_visible, deleted_at, onboarding_completed, onboarding_step",
    )
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (error) throw error;
  const row = data as CurrentProfileRow | null;
  if (row?.deleted_at) return null;
  return row;
}

export async function updateProfileLastSeen(profileId: string): Promise<void> {
  await supabase
    .from("profiles")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", profileId);
}

export async function fetchTopBarProfile(
  authUserId: string,
): Promise<TopBarProfileRow | null> {
  // После soft delete auth_user_id = null — запись всё равно не найдётся.
  const { data: profile, error } = await supabase
    .from("profiles")
    .select(
      "id, full_name, city, is_pro, pro_expires_at, subscription_plan",
    )
    .eq("auth_user_id", authUserId)
    .maybeSingle();
  if (error) throw error;
  return (profile as TopBarProfileRow | null) ?? null;
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
  if (error) throw error;

  const { error: locErr } = await supabase
    .from("locations")
    .update({ is_active: visible })
    .eq("user_id", profileId);
  if (locErr) throw locErr;
}

export async function fetchMapVisible(profileId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("profiles")
    .select("map_visible")
    .eq("id", profileId)
    .maybeSingle();
  if (error) throw error;
  return (data as { map_visible?: boolean | null } | null)?.map_visible !== false;
}
