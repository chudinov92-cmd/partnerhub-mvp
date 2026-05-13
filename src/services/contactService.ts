"use client";

import { supabase } from "@/lib/supabaseClient";
import { MAX_RELATION_ROWS } from "@/services/constants";

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

export async function fetchViewedProfileIds(viewerId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("profile_views")
    .select("viewed_profile_id")
    .eq("viewer_id", viewerId)
    .limit(MAX_RELATION_ROWS);
  if (error) throw error;
  return (data as { viewed_profile_id: string }[] | null)?.map(
    (r) => r.viewed_profile_id,
  ) ?? [];
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

export async function insertProfileView(viewerId: string, viewedProfileId: string) {
  const { error } = await supabase.from("profile_views").insert({
    viewer_id: viewerId,
    viewed_profile_id: viewedProfileId,
  });
  if (error) throw error;
}
