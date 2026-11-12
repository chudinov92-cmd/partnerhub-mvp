"use client";

import { supabase } from "@my-startup/auth";

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

type DashboardCountsParams = {
  fromIso: string;
  toIso: string;
  activeCutoff: string;
};

type DashboardCountsResult = [
  { count: number; error: null } | Error,
  { count: number; error: null } | Error,
  { count: number; error: null } | Error,
  { count: number; error: null } | Error,
  { count: number; error: null } | Error,
  { count: number; error: null } | Error,
];

let dashboardCountsCache:
  | { key: string; at: number; value: DashboardCountsResult }
  | null = null;

const DASHBOARD_COUNTS_CACHE_MS = 45_000;

async function adminFetchDashboardCountsUncached(params: DashboardCountsParams): Promise<DashboardCountsResult> {
  const qs = `from=${encodeURIComponent(params.fromIso.slice(0, 10))}&to=${encodeURIComponent(params.toIso.slice(0, 10))}`;
  const res = await fetch(`/api/admin/analytics/dashboard-counts?${qs}`, {
    credentials: "include",
  } as RequestInit);

  if (!res.ok) {
    const body = (await res.json()) as { error?: string };
    const err = new Error(body.error ?? "Dashboard counts request failed");
    return [err, err, err, err, err, err] as unknown as Awaited<ReturnType<typeof adminFetchDashboardCounts>>;
  }

  const json = (await res.json()) as {
    profilesTotal: number;
    profilesActive2m: number;
    posts: number;
    messages: number;
    reportsNew: number;
    reportsResolved: number;
  };

  return [
    { count: json.profilesTotal, error: null },
    { count: json.profilesActive2m, error: null },
    { count: json.posts, error: null },
    { count: json.messages, error: null },
    { count: json.reportsNew, error: null },
    { count: json.reportsResolved, error: null },
  ] as unknown as Awaited<ReturnType<typeof adminFetchDashboardCounts>>;
}

export async function adminFetchDashboardCounts(params: DashboardCountsParams) {
  const key = `${params.fromIso}|${params.toIso}|${params.activeCutoff}`;
  const now = Date.now();
  if (
    dashboardCountsCache &&
    dashboardCountsCache.key === key &&
    now - dashboardCountsCache.at < DASHBOARD_COUNTS_CACHE_MS
  ) {
    return dashboardCountsCache.value;
  }

  const value = await adminFetchDashboardCountsUncached(params);
  dashboardCountsCache = { key, at: now, value };
  return value;
}