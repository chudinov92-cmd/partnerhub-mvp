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
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
