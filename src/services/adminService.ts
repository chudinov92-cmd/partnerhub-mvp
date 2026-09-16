"use client";

import { supabase } from "@/lib/supabaseClient";

export async function adminGetAuthUser() {
  return supabase.auth.getUser();
}

export async function adminSignOut() {
  return supabase.auth.signOut();
}

export async function adminGetAdminRow(authUserId: string) {
  return supabase
    .from("admin_users")
    .select("auth_user_id, role")
    .eq("auth_user_id", authUserId)
    .maybeSingle();
}

export async function adminInsertAuditLog(row: Record<string, unknown>) {
  return supabase.from("admin_audit_log").insert(row);
}

export async function adminFetchProfilesList() {
  return supabase
    .from("profiles")
    .select("id, full_name, city, role_title, rating_count, last_seen_at, is_blocked")
    .order("full_name", { ascending: true })
    .limit(500);
}

export async function adminFetchPostsList() {
  return supabase
    .from("posts")
    .select(
      "id, body, created_at, city, author_id, moderation_status, moderation_reason, moderated_at, author:profiles(full_name)",
    )
    .order("created_at", { ascending: false })
    .limit(300);
}

export async function adminFetchAbuseReportsList() {
  return supabase
    .from("abuse_reports")
    .select(
      "id, created_at, reporter_profile_id, target_type, target_id, category, comment, status, resolution, assigned_to, resolved_at",
    )
    .order("created_at", { ascending: false })
    .limit(300);
}

export async function adminUpdateAbuseReport(
  id: string,
  patch: Record<string, unknown>,
) {
  return supabase.from("abuse_reports").update(patch).eq("id", id);
}

export async function adminInsertAbuseReportEvent(row: {
  report_id: string;
  action: string;
  payload: Record<string, unknown>;
}) {
  return supabase.from("abuse_report_events").insert(row);
}

export async function adminFetchCatalogs() {
  return Promise.all([
    supabase.from("industry_catalog").select("label,is_stock"),
    supabase.from("subindustry_catalog").select("industry_label,label,is_stock"),
    supabase.from("profession_catalog").select("label,is_stock"),
  ]);
}

export async function adminInsertIndustry(label: string) {
  return supabase.from("industry_catalog").insert({ label });
}

export async function adminInsertSubindustry(
  industryLabel: string,
  label: string,
) {
  return supabase
    .from("subindustry_catalog")
    .insert({ industry_label: industryLabel, label });
}

export async function adminInsertProfession(label: string) {
  return supabase.from("profession_catalog").insert({ label });
}

export async function adminDeleteIndustry(label: string) {
  await supabase
    .from("subindustry_catalog")
    .delete()
    .eq("industry_label", label);
  return supabase.from("industry_catalog").delete().eq("label", label);
}

export async function adminDeleteSubindustry(
  industryLabel: string,
  label: string,
) {
  return supabase
    .from("subindustry_catalog")
    .delete()
    .eq("industry_label", industryLabel)
    .eq("label", label);
}

export async function adminDeleteProfession(label: string) {
  return supabase.from("profession_catalog").delete().eq("label", label);
}

export async function adminFetchAdminUsersList() {
  return supabase
    .from("admin_users")
    .select("auth_user_id, role, created_at, created_by")
    .order("created_at", { ascending: false })
    .limit(200);
}

export async function adminInsertAdminUser(row: {
  auth_user_id: string;
  role: string;
  created_by: string | null;
}) {
  return supabase.from("admin_users").insert(row);
}

export async function adminUpdateAdminUserRole(
  authUserId: string,
  role: string,
) {
  return supabase
    .from("admin_users")
    .update({ role })
    .eq("auth_user_id", authUserId);
}

export async function adminDeleteAdminUser(authUserId: string) {
  return supabase.from("admin_users").delete().eq("auth_user_id", authUserId);
}

export async function adminFetchPioneerPromoSettings() {
  return supabase
    .from("pioneer_promo_settings")
    .select("id, enabled, updated_at")
    .eq("id", true)
    .maybeSingle();
}

export async function adminSetPioneerPromoEnabled(enabled: boolean) {
  return supabase
    .from("pioneer_promo_settings")
    .update({ enabled })
    .eq("id", true);
}

export async function adminFetchPioneerSlots() {
  return supabase
    .from("city_pioneer_slots")
    .select("city, used_count, max_count")
    .order("city", { ascending: true });
}

export async function adminSetPioneerCityMax(city: string, maxCount: number) {
  return supabase
    .from("city_pioneer_slots")
    .upsert({ city, max_count: maxCount }, { onConflict: "city" });
}

export async function adminFetchDashboardCounts(params: {
  fromIso: string;
  toIso: string;
  activeCutoff: string;
}) {
  const { fromIso, toIso, activeCutoff } = params;
  return Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gte("last_seen_at", activeCutoff),
    supabase
      .from("posts")
      .select("id", { count: "exact", head: true })
      .gte("created_at", fromIso)
      .lte("created_at", toIso),
    supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .gte("created_at", fromIso)
      .lte("created_at", toIso),
    supabase
      .from("abuse_reports")
      .select("id", { count: "exact", head: true })
      .eq("status", "new"),
    supabase
      .from("abuse_reports")
      .select("id", { count: "exact", head: true })
      .eq("status", "resolved"),
  ]);
}
