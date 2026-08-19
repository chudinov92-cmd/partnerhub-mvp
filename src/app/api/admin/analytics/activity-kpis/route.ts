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

type ActivityKpisRow = {
  dau_yesterday: number;
  wau_7d: number;
  mau_30d: number;
};

/** DAU вчера, WAU 7д, MAU 30д из user_daily_activity (UTC). */
export async function GET() {
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
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
