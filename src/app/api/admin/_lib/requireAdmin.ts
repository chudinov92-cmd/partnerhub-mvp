import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createSupabaseAdminClient, createSupabaseRouteClient } from "@/lib/supabaseServer";

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

export async function requireMinRole(
  min: AdminRole,
): Promise<
  | { ok: true; authUserId: string; role: AdminRole }
  | { ok: false; response: NextResponse }
> {
  const cookieStore = await cookies();
  const sb = createSupabaseRouteClient(cookieStore);
  const {
    data: { user },
  } = await sb.auth.getUser();

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const role = await fetchAdminRoleForAuthUser(user.id);
  if (!hasMinRole(role, min)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { ok: true, authUserId: user.id, role: role! };
}

export async function requireSuperAdmin(): Promise<
  | { ok: true; authUserId: string }
  | { ok: false; response: NextResponse }
> {
  const auth = await requireMinRole("super_admin");
  if (!auth.ok) return auth;
  return { ok: true, authUserId: auth.authUserId };
}
