import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  getRobokassaPassword1,
  isRobokassaTestMode,
  signPaymentRequest,
} from "@/lib/robokassa";
import { createSupabaseRouteClient } from "@/lib/supabaseServer";
import { createSupabaseAdmin } from "@/lib/supabaseAdmin";

const OUT_SUM = "249.00";
const PLAN = "pro_monthly";
const DESCRIPTION = "Подписка Zeip Pro на 1 месяц";

export async function POST() {
  const merchantLogin = process.env.NEXT_PUBLIC_ROBOKASSA_MERCHANT_LOGIN;
  const password1 = getRobokassaPassword1();

  if (!merchantLogin || !password1) {
    return NextResponse.json(
      { error: "Robokassa не настроена на сервере" },
      { status: 503 },
    );
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
    .select("id, is_pro, pro_expires_at")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return NextResponse.json({ error: "Профиль не найден" }, { status: 404 });
  }

  const proActive =
    profile.is_pro &&
    (!profile.pro_expires_at ||
      new Date(profile.pro_expires_at).getTime() > Date.now());

  if (proActive) {
    return NextResponse.json(
      { error: "Подписка Pro уже активна" },
      { status: 409 },
    );
  }

  const invId = Math.floor(100_000_000 + Math.random() * 900_000_000);
  const signatureValue = signPaymentRequest(
    merchantLogin,
    OUT_SUM,
    invId,
    password1,
  );

  const { error: insertError } = await admin.from("subscription_payments").insert({
    inv_id: invId,
    profile_id: profile.id,
    out_sum: parseFloat(OUT_SUM),
    plan: PLAN,
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
  url.searchParams.set("OutSum", OUT_SUM);
  url.searchParams.set("InvId", String(invId));
  url.searchParams.set("Description", DESCRIPTION);
  url.searchParams.set("SignatureValue", signatureValue);
  url.searchParams.set("Culture", "ru");
  if (isRobokassaTestMode()) {
    url.searchParams.set("IsTest", "1");
  }

  return NextResponse.json({ paymentUrl: url.toString() });
}
