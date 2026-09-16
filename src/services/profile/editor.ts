"use client";

import { supabase } from "@/lib/supabaseClient";
import type { ProfileWorkBlock } from "@/types";
import type { LocationPointRow } from "@/services/profile/map";

const ONBOARDING_PROFILE_SELECT =
  "id, full_name, age, city, industry, industry_other, subindustry, role_title, current_status, skills, resources, interested_in, seeking, onboarding_step, onboarding_completed";

const EDITOR_PROFILE_SELECT =
  "id, full_name, age, country, city, industry, industry_other, subindustry, role_title, experience_years, current_status, skills, looking_for, resources, can_help_with, interested_in, seeking, is_pro, pro_expires_at, subscription_plan";

export async function upsertProfilePrivate(row: {
  profile_id: string;
  last_name: string | null;
  updated_at: string;
}) {
  return supabase.from("profile_private").upsert(row, { onConflict: "profile_id" });
}

export async function insertLocation(row: {
  user_id: string;
  lat: number;
  lng: number;
  city: string | null;
  is_active: boolean;
}) {
  return supabase.from("locations").insert(row);
}

export async function claimPioneerSlot(params: { p_city: string }) {
  return supabase.rpc("claim_pioneer_slot", params);
}

export async function completeOnboarding(profileId: string) {
  return supabase
    .from("profiles")
    .update({
      onboarding_completed: true,
      onboarding_step: 4,
      map_visible: true,
    })
    .eq("id", profileId);
}

export async function deleteProfileWork(profileId: string) {
  return supabase.from("profile_work").delete().eq("profile_id", profileId);
}

export async function insertProfileWork(
  rows: Record<string, unknown>[],
) {
  return supabase.from("profile_work").insert(rows);
}

export async function fetchOrCreateOnboardingProfile(authUserId: string) {
  const { data: existing, error: fetchErr } = await supabase
    .from("profiles")
    .select(ONBOARDING_PROFILE_SELECT)
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (fetchErr) return { data: null, error: fetchErr };
  if (existing) return { data: existing, error: null };

  const { data: created, error: createErr } = await supabase
    .from("profiles")
    .insert({
      auth_user_id: authUserId,
      country: "Россия",
      seeking: [],
    })
    .select(ONBOARDING_PROFILE_SELECT)
    .single();

  return { data: created, error: createErr };
}

export async function fetchOrCreateEditorProfile(authUserId: string) {
  const { data: existing, error: fetchErr } = await supabase
    .from("profiles")
    .select(EDITOR_PROFILE_SELECT)
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (fetchErr) return { data: null, error: fetchErr };
  if (existing) return { data: existing, error: null };

  const { data: created, error: createErr } = await supabase
    .from("profiles")
    .insert({
      auth_user_id: authUserId,
      country: "Россия",
    })
    .select(EDITOR_PROFILE_SELECT)
    .single();

  return { data: created, error: createErr };
}

export async function fetchProfileLastName(
  profileId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("profile_private")
    .select("last_name")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (error) throw error;
  return typeof data?.last_name === "string" ? data.last_name : null;
}

export async function fetchProfileWorkBlocks(
  profileId: string,
): Promise<{ data: ProfileWorkBlock[]; error: null } | { data: null; error: Error }> {
  const { data, error } = await supabase
    .from("profile_work")
    .select(
      "id, role_title, industry, industry_other, subindustry, experience_years, sort_order",
    )
    .eq("profile_id", profileId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    return {
      data: null,
      error: new Error(error.message),
    };
  }

  return { data: (data ?? []) as ProfileWorkBlock[], error: null };
}

export async function fetchLocationForProfile(
  profileId: string,
): Promise<LocationPointRow | null> {
  const { data, error } = await supabase
    .from("locations")
    .select("id, user_id, lat, lng, city")
    .eq("user_id", profileId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return data as LocationPointRow;
}

export async function fetchLocationCoordsForProfile(
  profileId: string,
): Promise<{ lat: number; lng: number } | null> {
  const { data, error } = await supabase
    .from("locations")
    .select("lat, lng")
    .eq("user_id", profileId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return { lat: data.lat, lng: data.lng };
}

export async function updateProfileById(
  profileId: string,
  patch: Record<string, unknown>,
) {
  return supabase.from("profiles").update(patch).eq("id", profileId);
}

export async function upsertActiveLocation(params: {
  profileId: string;
  lat: number;
  lng: number;
  city: string | null;
  isActive: boolean;
  existingLocationId?: string | null;
}) {
  const { profileId, lat, lng, city, isActive } = params;
  let locationId = params.existingLocationId?.trim() || null;

  if (!locationId) {
    const { data, error } = await supabase
      .from("locations")
      .select("id")
      .eq("user_id", profileId)
      .maybeSingle();
    if (error) return { data: null, error };
    locationId = (data as { id?: string } | null)?.id ?? null;
  }

  if (locationId) {
    return supabase
      .from("locations")
      .update({
        lat,
        lng,
        city,
        is_active: isActive,
      })
      .eq("id", locationId);
  }

  return insertLocation({
    user_id: profileId,
    lat,
    lng,
    city,
    is_active: isActive,
  });
}
