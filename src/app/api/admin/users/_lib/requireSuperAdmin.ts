import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabaseServer";
import {
  fetchAdminRoleForAuthUser,
  hasMinRole,
} from "@/app/api/admin/_lib/requireAdmin";

export async function requireSuperAdmin(): Promise<
  | { ok: true; authUserId: string }
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
  if (!hasMinRole(role, "super_admin")) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { ok: true, authUserId: user.id };
}
