import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabaseServer";
import { requireMinRole } from "@/app/api/admin/_lib/requireAdmin";
import { jsonRouteError } from "@/app/api/_lib/jsonRouteError";

export const runtime = "nodejs";

type PaywallFunnelStep = {
  event_type: string;
  cnt: number;
  unique_users: number;
};

type PaywallFunnelIntent = {
  intent: string;
  shown_cnt: number;
};

type PaywallFunnelRpcResult = {
  steps?: PaywallFunnelStep[] | null;
  shown_to_cta_pct?: number | null;
  shown_to_paid_pct?: number | null;
  intents?: PaywallFunnelIntent[] | null;
};

/** Воронка пейвола за период (from/to YYYY-MM-DD). */
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

    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.rpc("get_paywall_funnel", {
      p_from: fromIso,
      p_to: toIso,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const parsed = (data ?? {}) as PaywallFunnelRpcResult;

    return NextResponse.json({
      steps: parsed.steps ?? [],
      shownToCtaPct: parsed.shown_to_cta_pct ?? null,
      shownToPaidPct: parsed.shown_to_paid_pct ?? null,
      intents: parsed.intents ?? [],
    });
  } catch (e) {
    return jsonRouteError("[admin/analytics/paywall-funnel]", e);
  }
}
