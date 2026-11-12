import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@my-startup/auth";
import { requireMinRole } from "@/app/api/admin/_lib/requireAdmin";
import { jsonRouteError } from "@/app/api/_lib/jsonRouteError";

export const runtime = "nodejs";

/**
 * Агрегированные счётчики для дашборда /admin/analytics.
 * Заменяет браузерный adminFetchDashboardCountsUncached из adminService.ts.
 */
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

    const fromIso = new Date(`${fromRaw}T00:00:00.000Z`).toISOString();
    const toIso = new Date(`${toRaw}T23:59:59.999Z`).toISOString();
    const activeCutoff = new Date(Date.now() - 2 * 60 * 1000).toISOString();

    const admin = createSupabaseAdminClient();

    const { count: profilesTotal, error: ptErr } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true });

    const { count: profilesActive2m, error: paErr } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gte("last_seen_at", activeCutoff);

    const { count: posts, error: poErr } = await admin
      .from("posts")
      .select("id", { count: "exact", head: true })
      .gte("created_at", fromIso)
      .lte("created_at", toIso);

    const { count: messages, error: msErr } = await admin
      .from("messages")
      .select("id", { count: "exact", head: true })
      .gte("created_at", fromIso)
      .lte("created_at", toIso);

    const { count: reportsNew, error: rnErr } = await admin
      .from("abuse_reports")
      .select("id", { count: "exact", head: true })
      .eq("status", "new");

    const { count: reportsResolved, error: rrErr } = await admin
      .from("abuse_reports")
      .select("id", { count: "exact", head: true })
      .eq("status", "resolved");

    const anyErr = ptErr || paErr || poErr || msErr || rnErr || rrErr;
    if (anyErr) {
      return NextResponse.json({ error: anyErr.message }, { status: 500 });
    }

    return NextResponse.json({
      profilesTotal: profilesTotal ?? 0,
      profilesActive2m: profilesActive2m ?? 0,
      posts: posts ?? 0,
      messages: messages ?? 0,
      reportsNew: reportsNew ?? 0,
      reportsResolved: reportsResolved ?? 0,
    });
  } catch (e) {
    return jsonRouteError("[admin/analytics/dashboard-counts]", e);
  }
}