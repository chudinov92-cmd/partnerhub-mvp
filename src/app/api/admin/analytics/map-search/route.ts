import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabaseServer";
import { requireMinRole } from "@/app/api/admin/_lib/requireAdmin";
import { jsonRouteError } from "@/app/api/_lib/jsonRouteError";

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

/** Матрица поисков через фильтр карты за период. */
export async function GET(req: Request) {
  try {
    const auth = await requireMinRole("support");
    if (!auth.ok) return auth.response;

    const url = new URL(req.url);
    const fromRaw = url.searchParams.get("from");
    const toRaw = url.searchParams.get("to");
    if (!fromRaw || !toRaw) {
      return NextResponse.json(
        { error: "from and to (YYYY-MM-DD) required" },
        { status: 400 },
      );
    }

    const pFrom = new Date(`${fromRaw}T00:00:00.000Z`).toISOString();
    const pTo = new Date(`${toRaw}T23:59:59.999Z`).toISOString();

    const authFilter = url.searchParams.get("auth_filter") ?? "all";
    if (!["all", "authed", "guest"].includes(authFilter)) {
      return NextResponse.json({ error: "Invalid auth_filter" }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.rpc("get_map_search_matrix", {
      p_from: pFrom,
      p_to: pTo,
      p_city_context: url.searchParams.get("city_context") || null,
      p_country: url.searchParams.get("country") || null,
      p_age_from: parseOptionalInt(url.searchParams.get("age_from")),
      p_age_to: parseOptionalInt(url.searchParams.get("age_to")),
      p_is_pro: parseOptionalBool(url.searchParams.get("is_pro")),
      p_auth_filter: authFilter,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ rows: data ?? [] });
  } catch (e) {
    return jsonRouteError("[admin/analytics/map-search]", e);
  }
}
