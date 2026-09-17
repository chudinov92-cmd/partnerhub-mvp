"use client";

import { supabase } from "@/lib/supabaseClient";
import { MAX_RELATION_ROWS } from "@/services/constants";
import {
  FREE_FAVORITES_LIMIT,
  FREE_PROFILE_VIEWS_LIMIT,
} from "@/lib/subscriptionPlans";
import type { SubscriptionPlan } from "@/lib/subscriptionPlans";
import { PROFILE_MAP_SELECT } from "@/services/profile/map";
import type { Profile } from "@/types";

type ContactProfileRow = Profile & { deleted_at?: string | null };

function normalizeContactProfile(
  raw: ContactProfileRow | ContactProfileRow[] | null | undefined,
): Profile | null {
  const prof = Array.isArray(raw) ? raw[0] : raw;
  if (!prof?.id) return null;
  const { deleted_at: deletedAt, ...profile } = prof;
  if (deletedAt) {
    return {
      ...(profile as Profile),
      full_name: profile.full_name?.trim() || "Удалённый пользователь",
    };
  }
  return profile as Profile;
}

export async function countContactsForOwner(profileId: string): Promise<number> {
  const { count, error } = await supabase
    .from("profile_contacts")
    .select("contact_profile_id", { count: "exact", head: true })
    .eq("owner_id", profileId);
  if (error) throw error;
  return count ?? 0;
}

export async function fetchContactProfileIds(ownerId: string): Promise<string[]> {
  const profiles = await fetchContactProfiles(ownerId);
  return profiles.map((profile) => profile.id);
}

type ContactProfileRpcRow = ContactProfileRow & {
  contact_created_at?: string | null;
};

function buildUnavailableContactProfile(profileId: string): Profile {
  return {
    id: profileId,
    full_name: "Профиль недоступен",
    city: null,
    industry: null,
    subindustry: null,
    role_title: null,
    last_seen_at: null,
    rating_avg: null,
    rating_count: null,
  };
}

function isMissingRpcError(error: unknown): boolean {
  const code = String((error as { code?: string })?.code ?? "");
  const msg = String((error as { message?: string })?.message ?? "");
  return (
    code === "PGRST202" ||
    msg.includes("get_contact_profiles") ||
    msg.includes("Could not find the function")
  );
}

async function fetchContactProfilesViaRpc(
  ownerId: string,
): Promise<Profile[] | null> {
  const { data, error } = await supabase.rpc("get_contact_profiles", {
    p_owner_id: ownerId,
  });
  if (error) {
    if (isMissingRpcError(error)) return null;
    throw error;
  }

  return ((data ?? []) as ContactProfileRpcRow[])
    .map((row) => normalizeContactProfile(row))
    .filter((profile): profile is Profile => profile != null);
}

async function fetchContactProfilesFallback(
  ownerId: string,
): Promise<Profile[]> {
  const { data, error } = await supabase
    .from("profile_contacts")
    .select("created_at, contact_profile_id")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false })
    .limit(MAX_RELATION_ROWS);
  if (error) throw error;

  const orderedIds =
    (data as { contact_profile_id: string }[] | null)?.map(
      (row) => row.contact_profile_id,
    ) ?? [];
  if (orderedIds.length === 0) return [];

  const { data: profileRows, error: profilesError } = await supabase
    .from("profiles")
    .select(`${PROFILE_MAP_SELECT}, deleted_at`)
    .in("id", orderedIds);
  if (profilesError) throw profilesError;

  const byId = new Map<string, Profile>();
  for (const row of (profileRows ?? []) as ContactProfileRow[]) {
    const profile = normalizeContactProfile(row);
    if (profile) byId.set(profile.id, profile);
  }

  return orderedIds.map((id) => byId.get(id) ?? buildUnavailableContactProfile(id));
}

/** Профили избранных контактов (без требования map_visible). */
export async function fetchContactProfiles(ownerId: string): Promise<Profile[]> {
  const viaRpc = await fetchContactProfilesViaRpc(ownerId);
  if (viaRpc != null) return viaRpc;
  return fetchContactProfilesFallback(ownerId);
}

export async function fetchTodayOpenedProfileIds(
  viewerId: string,
): Promise<string[]> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("profile_views")
    .select("viewed_profile_id, last_opened_at")
    .eq("viewer_id", viewerId)
    .gte("last_opened_at", startOfDay.toISOString())
    .limit(MAX_RELATION_ROWS);

  if (error) throw error;

  return (
    (data as { viewed_profile_id: string }[] | null)?.map(
      (r) => r.viewed_profile_id,
    ) ?? []
  );
}

export async function countTodayProfileViews(viewerId: string): Promise<number> {
  const ids = await fetchTodayOpenedProfileIds(viewerId);
  return ids.length;
}

export { FREE_FAVORITES_LIMIT, FREE_PROFILE_VIEWS_LIMIT };

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

export async function insertContact(
  ownerId: string,
  contactProfileId: string,
  options?: { subscriptionPlan?: SubscriptionPlan; currentCount?: number },
) {
  const plan = options?.subscriptionPlan ?? "free";
  const currentCount = options?.currentCount;

  if (plan === "free") {
    const count =
      currentCount ??
      (await fetchContactProfileIds(ownerId)).length;
    if (count >= FREE_FAVORITES_LIMIT) {
      throw new Error(
        `На тарифе Free можно сохранить до ${FREE_FAVORITES_LIMIT} контактов. Оформите Pro для безлимитного избранного.`,
      );
    }
  }

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
  const now = new Date().toISOString();
  const { error } = await supabase.from("profile_views").upsert(
    {
      viewer_id: viewerId,
      viewed_profile_id: viewedProfileId,
      viewed_content_updated_at: viewedContentUpdatedAt,
      last_opened_at: now,
    },
    { onConflict: "viewer_id,viewed_profile_id" },
  );
  if (error) throw error;
}
