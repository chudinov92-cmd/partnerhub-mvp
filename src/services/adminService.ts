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

export async function adminInsertAuditLog(
  row: Record<string, unknown>,
) {
  return supabase.from("admin_audit_log").insert(row);
}

/** Typed table access for admin panel pages (RLS bypass via admin role). */
export function adminFrom<T extends string>(table: T) {
  return supabase.from(table);
}
