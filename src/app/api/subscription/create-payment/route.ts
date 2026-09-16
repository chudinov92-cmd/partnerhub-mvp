import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  allocRobokassaInvId,
  buildRobokassaPaymentUrl,
  getRobokassaPassword1,
} from "@/lib/robokassa";
import { getPaymentReturnSiteUrl } from "@/lib/paymentReturn";
import {
  buildPaymentPlanId,
  getEffectiveSubscriptionPlan,
  isActiveProProfile,
  parsePaymentPlanId,
  planRank,
  type PaidSubscriptionPlan,
  type SubscriptionPeriod,
} from "@/lib/subscriptionPlans";
import { createSupabaseRouteClient } from "@/lib/supabaseServer";
import { createSupabaseAdmin } from "@/lib/supabaseAdmin";
import { jsonRouteError } from "@/app/api/_lib/jsonRouteError";

function parseBody(body: unknown): {
  plan: PaidSubscriptionPlan;
  period: SubscriptionPeriod;
} | null {
  if (!body || typeof body !== "object") return null;
  const { plan, period } = body as { plan?: string; period?: string };
  if (plan !== "pro" && plan !== "pro_plus") return null;
  if (period !== "monthly" && period !== "yearly") return null;
  return { plan, period };
}

export async function POST(req: Request) {
  try {
    const merchantLogin = process.env.NEXT_PUBLIC_ROBOKASSA_MERCHANT_LOGIN;
    const password1 = getRobokassaPassword1();

    if (!merchantLogin || !password1) {
      return NextResponse.json(
        { error: "Robokassa не настроена на сервере" },
        { status: 503 },
      );
    }

    let parsedBody: { plan: PaidSubscriptionPlan; period: SubscriptionPeriod } | null =
      null;
    try {
      parsedBody = parseBody(await req.json());
    } catch {
      parsedBody = null;
    }

    if (!parsedBody) {
      return NextResponse.json(
        { error: "Укажите plan (pro | pro_plus) и period (monthly | yearly)" },
        { status: 400 },
      );
    }

    const paymentPlanId = buildPaymentPlanId(parsedBody.plan, parsedBody.period);
    const pricing = parsePaymentPlanId(paymentPlanId);
    if (!pricing) {
      return NextResponse.json({ error: "Неизвестный тариф" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const sb = createSupabaseRouteClient(cookieStore);

    const {
      data: { user },
      error: authError,
    } = await sb.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const admin = createSupabaseAdmin();

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("id, is_pro, pro_expires_at, subscription_plan")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Профиль не найден" }, { status: 404 });
    }

    const currentPlan = isActiveProProfile(profile)
      ? getEffectiveSubscriptionPlan(profile)
      : "free";

    if (
      isActiveProProfile(profile) &&
      planRank(currentPlan) >= planRank(parsedBody.plan)
    ) {
      return NextResponse.json(
        { error: "У вас уже активен этот или более высокий тариф" },
        { status: 409 },
      );
    }

    const invId = allocRobokassaInvId();

    const { error: insertError } = await admin.from("subscription_payments").insert({
      inv_id: invId,
      profile_id: profile.id,
      out_sum: parseFloat(pricing.outSum),
      plan: paymentPlanId,
      period: parsedBody.period,
      status: "pending",
    });

    if (insertError) {
      console.error("[create-payment] insert error", insertError);
      return NextResponse.json(
        { error: "Не удалось создать платёж" },
        { status: 500 },
      );
    }

    const siteUrl = getPaymentReturnSiteUrl(req);
    const paymentUrl = buildRobokassaPaymentUrl({
      merchantLogin,
      password1,
      outSum: pricing.outSum,
      invId,
      description: pricing.description,
      siteUrl,
    });

    return NextResponse.json({ paymentUrl, invId });
  } catch (err) {
    return jsonRouteError("[create-payment]", err);
  }
}
