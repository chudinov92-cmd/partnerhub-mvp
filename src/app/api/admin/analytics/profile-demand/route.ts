import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  createSupabaseAdminClient,
  createSupabaseRouteClient,
} from "@/lib/supabaseServer";
import {
  fetchAdminRoleForAuthUser,
  hasMinRole,
} from "@/app/api/admin/_lib/requireAdmin";

export const runtime = "nodejs";

function parseOptionalInt(raw: string | null): number | null {
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function parseOptionalBool(raw: string | null): boolean | null {
  if (raw === "true") return true;
  if (raw === "false") return false;
  return null;
}

/** Матрица спроса из профилей (interested_in). Режим B: active_only + active_from/to. */
export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const sb = createSupabaseRouteClient(cookieStore);
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = await fetchAdminRoleForAuthUser(user.id);
    if (!hasMinRole(role, "support")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const url = new URL(req.url);
    const activeOnly = url.searchParams.get("active_only") === "true";
    const activeFromRaw = url.searchParams.get("active_from");
    const activeToRaw = url.searchParams.get("active_to");

    let activeFrom: string | null = null;
    let activeTo: string | null = null;
    if (activeOnly && activeFromRaw && activeToRaw) {
      activeFrom = new Date(`${activeFromRaw}T00:00:00.000Z`).toISOString();
      activeTo = new Date(`${activeToRaw}T23:59:59.999Z`).toISOString();
    }

    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.rpc("get_profile_demand_matrix", {
      p_city: url.searchParams.get("city") || null,
      p_country: url.searchParams.get("country") || null,
      p_age_from: parseOptionalInt(url.searchParams.get("age_from")),
      p_age_to: parseOptionalInt(url.searchParams.get("age_to")),
      p_is_pro: parseOptionalBool(url.searchParams.get("is_pro")),
      p_active_from: activeFrom,
      p_active_to: activeTo,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ rows: data ?? [] });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
