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

type RevenueSnapshotPoint = {
  snapshot_date: string;
  mrr_rub: number;
  active_pro: number;
  active_pro_plus: number;
  new_customers: number;
  renewals: number;
  churned: number;
};

type RevenueMetricsRpc = {
  yesterday?: {
    snapshot_date?: string;
    mrr_rub?: number;
    active_pro?: number;
    active_pro_plus?: number;
    new_customers?: number;
    renewals?: number;
    churned?: number;
  } | null;
  ltv?: {
    avg_ltv_rub?: number;
    avg_payments_per_user?: number;
  } | null;
  series?: RevenueSnapshotPoint[] | null;
};

/** MRR, churn и LTV для /admin/analytics Revenue. */
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
    const { data, error } = await admin.rpc("get_revenue_metrics");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const parsed = (data ?? {}) as RevenueMetricsRpc;

    return NextResponse.json({
      yesterday: {
        snapshotDate: parsed.yesterday?.snapshot_date ?? null,
        mrrRub: Number(parsed.yesterday?.mrr_rub ?? 0),
        activePro: Number(parsed.yesterday?.active_pro ?? 0),
        activeProPlus: Number(parsed.yesterday?.active_pro_plus ?? 0),
        newCustomers: Number(parsed.yesterday?.new_customers ?? 0),
        renewals: Number(parsed.yesterday?.renewals ?? 0),
        churned: Number(parsed.yesterday?.churned ?? 0),
      },
      ltv: {
        avgLtvRub: Number(parsed.ltv?.avg_ltv_rub ?? 0),
        avgPaymentsPerUser: Number(parsed.ltv?.avg_payments_per_user ?? 0),
      },
      series: (parsed.series ?? []).map((row) => ({
        snapshotDate: row.snapshot_date,
        mrrRub: Number(row.mrr_rub ?? 0),
        activePro: Number(row.active_pro ?? 0),
        activeProPlus: Number(row.active_pro_plus ?? 0),
        newCustomers: Number(row.new_customers ?? 0),
        renewals: Number(row.renewals ?? 0),
        churned: Number(row.churned ?? 0),
      })),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
