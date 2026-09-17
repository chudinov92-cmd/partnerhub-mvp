import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  allocRobokassaInvId,
  buildRobokassaPaymentUrl,
  getRobokassaPassword1,
} from "@/lib/robokassa";
import { getPaymentReturnSiteUrl } from "@/lib/paymentReturn";
import {
  buildUpgradeDescription,
  buildUpgradeReceiptName,
  calculateUpgradePrice,
  formatUpgradeOutSum,
  isActiveProProfile,
  UPGRADE_PLAN_ID,
  upgradeRemainingDays,
} from "@/lib/subscriptionPlans";
import { createSupabaseRouteClient } from "@/lib/supabaseServer";
import { createSupabaseAdmin } from "@/lib/supabaseAdmin";
import { jsonRouteError } from "@/app/api/_lib/jsonRouteError";

async function applyInstantUpgrade(profileId: string) {
  const admin = createSupabaseAdmin();
  const { error } = await admin
    .from("profiles")
    .update({
      subscription_plan: "pro_plus",
      is_pro: true,
    })
    .eq("id", profileId);

  if (error) {
    throw error;
  }
}

export async function POST(req: Request) {
  try {
    const merchantLogin = process.env.NEXT_PUBLIC_ROBOKASSA_MERCHANT_LOGIN;
    const password1 = getRobokassaPassword1();

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

    if (!isActiveProProfile(profile)) {
      return NextResponse.json(
        { error: "Апгрейд доступен только при активной подписке Pro" },
        { status: 400 },
      );
    }

    if (profile.subscription_plan === "pro_plus") {
      return NextResponse.json(
        { error: "У вас уже активен тариф Pro+" },
        { status: 409 },
      );
    }

    if (profile.subscription_plan !== "pro") {
      return NextResponse.json(
        { error: "Апгрейд доступен только с тарифа Pro" },
        { status: 400 },
      );
    }

    if (!profile.pro_expires_at) {
      return NextResponse.json(
        {
          error:
            "Не удалось рассчитать апгрейд: нет даты окончания подписки. Напишите в поддержку.",
        },
        { status: 400 },
      );
    }

    const remainingDays = upgradeRemainingDays(profile.pro_expires_at);

    if (remainingDays <= 0) {
      try {
        await applyInstantUpgrade(profile.id);
        return NextResponse.json({
          upgraded: true,
          upgradePrice: 0,
          remainingDays: 0,
        });
      } catch (e) {
        console.error("[create-upgrade-payment] instant upgrade error", e);
        return NextResponse.json(
          { error: "Не удалось выполнить апгрейд" },
          { status: 500 },
        );
      }
    }

    if (!merchantLogin || !password1) {
      return NextResponse.json(
        { error: "Robokassa не настроена на сервере" },
        { status: 503 },
      );
    }

    const upgradePrice = calculateUpgradePrice(remainingDays);
    const outSum = formatUpgradeOutSum(upgradePrice);
    const description = buildUpgradeDescription(remainingDays);
    const receiptName = buildUpgradeReceiptName(remainingDays);

    const invId = allocRobokassaInvId();

    const { error: insertError } = await admin.from("subscription_payments").insert({
      inv_id: invId,
      profile_id: profile.id,
      out_sum: upgradePrice,
      plan: UPGRADE_PLAN_ID,
      status: "pending",
    });

    if (insertError) {
      console.error("[create-upgrade-payment] insert error", insertError);
      return NextResponse.json(
        { error: "Не удалось создать платёж" },
        { status: 500 },
      );
    }

    const siteUrl = getPaymentReturnSiteUrl(req);
    const paymentUrl = buildRobokassaPaymentUrl({
      merchantLogin,
      password1,
      outSum,
      invId,
      description,
      receiptName,
      email: user.email ?? undefined,
      siteUrl,
    });

    return NextResponse.json({
      paymentUrl,
      invId,
      upgradePrice,
      remainingDays,
    });
  } catch (err) {
    return jsonRouteError("[create-upgrade-payment]", err);
  }
}
