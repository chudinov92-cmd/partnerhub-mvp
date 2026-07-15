import crypto from "crypto";
import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * Robokassa Result URL (POST).
 * Вызывается Robokassa после успешной оплаты.
 * Ответ должен быть точно: OK{InvId}
 * Иначе Robokassa будет повторять запросы.
 */
export async function POST(req: Request) {
  const password2 = process.env.ROBOKASSA_PASSWORD2;
  if (!password2) {
    console.error("[webhook] ROBOKASSA_PASSWORD2 не задан");
    return new Response("Server misconfigured", { status: 500 });
  }

  let body: URLSearchParams;
  try {
    const text = await req.text();
    body = new URLSearchParams(text);
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  const outSum = body.get("OutSum") ?? "";
  const invIdStr = body.get("InvId") ?? "";
  const signatureValue = (body.get("SignatureValue") ?? "").toLowerCase();

  if (!outSum || !invIdStr || !signatureValue) {
    return new Response("Missing params", { status: 400 });
  }

  const invId = parseInt(invIdStr, 10);
  if (isNaN(invId)) {
    return new Response("Invalid InvId", { status: 400 });
  }

  // Проверка подписи: MD5(OutSum:InvId:Password2)
  const expected = crypto
    .createHash("md5")
    .update(`${outSum}:${invId}:${password2}`)
    .digest("hex")
    .toLowerCase();

  if (expected !== signatureValue) {
    console.error("[webhook] bad signature", { expected, got: signatureValue });
    return new Response("Bad signature", { status: 403 });
  }

  const admin = createSupabaseAdmin();

  // Найти платёж по InvId
  const { data: payment, error: paymentError } = await admin
    .from("subscription_payments")
    .select("id, profile_id, status")
    .eq("inv_id", invId)
    .maybeSingle();

  if (paymentError || !payment) {
    console.error("[webhook] payment not found", invId, paymentError);
    return new Response("Payment not found", { status: 404 });
  }

  // Идемпотентность: уже обработан
  if (payment.status === "paid") {
    return new Response(`OK${invId}`, { status: 200 });
  }

  // Обновить статус платежа
  await admin
    .from("subscription_payments")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("id", payment.id);

  // Активировать Pro на 30 дней
  const proExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const { error: profileError } = await admin
    .from("profiles")
    .update({ is_pro: true, pro_expires_at: proExpiresAt })
    .eq("id", payment.profile_id);

  if (profileError) {
    console.error("[webhook] profile update error", profileError);
    return new Response("DB error", { status: 500 });
  }

  console.log(`[webhook] Pro activated for profile ${payment.profile_id}, inv_id=${invId}`);

  // Обязательный ответ Robokassa: текст OK{InvId}
  return new Response(`OK${invId}`, {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
}
