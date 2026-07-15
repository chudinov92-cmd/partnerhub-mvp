import crypto from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabaseServer";
import { createSupabaseAdmin } from "@/lib/supabaseAdmin";

const OUT_SUM = "249.00";
const PLAN = "pro_monthly";
const DESCRIPTION = "Подписка Zeip Pro на 1 месяц";

export async function POST() {
  const merchantLogin = process.env.NEXT_PUBLIC_ROBOKASSA_MERCHANT_LOGIN;
  const password1 = process.env.ROBOKASSA_PASSWORD1;

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
    .select("id, is_pro")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return NextResponse.json({ error: "Профиль не найден" }, { status: 404 });
  }

  if (profile.is_pro) {
    return NextResponse.json(
      { error: "Подписка Pro уже активна" },
      { status: 409 },
    );
  }

  // Уникальный InvId: случайный 9-значный номер.
  const invId = Math.floor(100_000_000 + Math.random() * 900_000_000);

  // Подпись MD5: MerchantLogin:OutSum:InvId:Password1
  const signatureValue = crypto
    .createHash("md5")
    .update(`${merchantLogin}:${OUT_SUM}:${invId}:${password1}`)
    .digest("hex");

  // Сохраняем заказ в БД до редиректа (webhook придёт позже по InvId).
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

  const isTest = process.env.ROBOKASSA_TEST_MODE === "1";
  const url = new URL("https://auth.robokassa.ru/Merchant/Index.aspx");
  url.searchParams.set("MerchantLogin", merchantLogin);
  url.searchParams.set("OutSum", OUT_SUM);
  url.searchParams.set("InvId", String(invId));
  url.searchParams.set("Description", DESCRIPTION);
  url.searchParams.set("SignatureValue", signatureValue);
  url.searchParams.set("Culture", "ru");
  if (isTest) {
    url.searchParams.set("isTest", "1");
  }

  return NextResponse.json({ paymentUrl: url.toString() });
}
