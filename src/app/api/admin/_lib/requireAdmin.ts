import { createSupabaseAdminClient } from "@/lib/supabaseServer";

export type AdminRole = "super_admin" | "moderator" | "support";

/**
 * Убедиться что auth_user_id записан в admin_users (service_role после JWT).
 */
export async function fetchAdminRoleForAuthUser(authUserId: string): Promise<AdminRole | null> {
  const adminSb = createSupabaseAdminClient();
  const { data, error } = await adminSb
    .from("admin_users")
    .select("role")
    .eq("auth_user_id", authUserId)
    .maybeSingle();
  if (error || !data) return null;
  const r = (data as { role: AdminRole }).role;
  return r ?? null;
}

const ROLE_RANK: Record<AdminRole, number> = {
  support: 1,
  moderator: 2,
  super_admin: 3,
};

export function hasMinRole(
  role: AdminRole | null,
  min: AdminRole,
): boolean {
  if (!role) return false;
  return ROLE_RANK[role] >= ROLE_RANK[min];
}
