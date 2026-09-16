import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabaseServer";
import { requireMinRole } from "@/app/api/admin/_lib/requireAdmin";
import { jsonRouteError } from "@/app/api/_lib/jsonRouteError";

export const runtime = "nodejs";

type ActivityKpisRow = {
  dau_yesterday: number;
  wau_7d: number;
  mau_30d: number;
};

/** DAU вчера, WAU 7д, MAU 30д из user_daily_activity (UTC). */
export async function GET() {
  try {
    const auth = await requireMinRole("support");
    if (!auth.ok) return auth.response;

    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.rpc("get_activity_kpis");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const row = (Array.isArray(data) ? data[0] : data) as
      | ActivityKpisRow
      | null
      | undefined;

    return NextResponse.json({
      dauYesterday: Number(row?.dau_yesterday ?? 0),
      wau7d: Number(row?.wau_7d ?? 0),
      mau30d: Number(row?.mau_30d ?? 0),
    });
  } catch (e) {
    return jsonRouteError("[admin/analytics/activity-kpis]", e);
  }
}
