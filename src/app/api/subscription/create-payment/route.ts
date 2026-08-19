import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  getRobokassaPassword1,
  isRobokassaTestMode,
  signPaymentRequest,
} from "@/lib/robokassa";
import { getSiteUrl } from "@/lib/paymentReturn";
import {
  buildPaymentPlanId,
  parsePaymentPlanId,
  planRank,
  type PaidSubscriptionPlan,
  type SubscriptionPeriod,
} from "@/lib/subscriptionPlans";
import { createSupabaseRouteClient } from "@/lib/supabaseServer";
import { createSupabaseAdmin } from "@/lib/supabaseAdmin";

function isActivePaidProfile(row: {
  is_pro?: boolean | null;
  pro_expires_at?: string | null;
}): boolean {
  if (!row) return false;
  const expiresAt = row.pro_expires_at ?? null;
  const isProFlag = Boolean(row.is_pro);
  const notExpired =
    !expiresAt || new Date(expiresAt).getTime() > Date.now();
  return isProFlag && notExpired;
}

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

  const activePaid = isActivePaidProfile(profile);
  const currentPlan =
    activePaid && profile.subscription_plan === "pro_plus"
      ? "pro_plus"
      : activePaid && profile.subscription_plan === "pro"
        ? "pro"
        : "free";

  if (
    activePaid &&
    planRank(currentPlan) >= planRank(parsedBody.plan)
  ) {
    return NextResponse.json(
      { error: "У вас уже активен этот или более высокий тариф" },
      { status: 409 },
    );
  }

  const invId = Math.floor(100_000_000 + Math.random() * 900_000_000);
  const signatureValue = signPaymentRequest(
    merchantLogin,
    pricing.outSum,
    invId,
    password1,
  );

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

  const url = new URL("https://auth.robokassa.ru/Merchant/Index.aspx");
  url.searchParams.set("MerchantLogin", merchantLogin);
  url.searchParams.set("OutSum", pricing.outSum);
  url.searchParams.set("InvId", String(invId));
  url.searchParams.set("Description", pricing.description);
  url.searchParams.set("SignatureValue", signatureValue);
  url.searchParams.set("Culture", "ru");
  if (isRobokassaTestMode()) {
    url.searchParams.set("IsTest", "1");
  }

  const siteUrl = getSiteUrl();
  url.searchParams.set("SuccessURL", `${siteUrl}/payment/success`);
  url.searchParams.set("FailURL", `${siteUrl}/payment/fail`);

  return NextResponse.json({ paymentUrl: url.toString(), invId });
}
