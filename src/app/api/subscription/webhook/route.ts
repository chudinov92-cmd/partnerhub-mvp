import {
  getRobokassaPassword2,
  signResultWebhook,
} from "@/lib/robokassa";
import { createSupabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * Robokassa Result URL (POST).
 * Ответ должен быть точно: OK{InvId}
 */
export async function POST(req: Request) {
  const password2 = getRobokassaPassword2();
  if (!password2) {
    console.error("[webhook] ROBOKASSA password #2 не задан");
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
  const signatureValue = (body.get("SignatureValue") ?? "").toUpperCase();

  if (!outSum || !invIdStr || !signatureValue) {
    return new Response("Missing params", { status: 400 });
  }

  const invId = parseInt(invIdStr, 10);
  if (isNaN(invId)) {
    return new Response("Invalid InvId", { status: 400 });
  }

  const expected = signResultWebhook(outSum, invId, password2);

  if (expected !== signatureValue) {
    console.error("[webhook] bad signature", { expected, got: signatureValue });
    return new Response("Bad signature", { status: 403 });
  }

  const admin = createSupabaseAdmin();

  const { data: payment, error: paymentError } = await admin
    .from("subscription_payments")
    .select("id, profile_id, status")
    .eq("inv_id", invId)
    .maybeSingle();

  if (paymentError || !payment) {
    console.error("[webhook] payment not found", invId, paymentError);
    return new Response("Payment not found", { status: 404 });
  }

  if (payment.status === "paid") {
    return new Response(`OK${invId}`, { status: 200 });
  }

  await admin
    .from("subscription_payments")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("id", payment.id);

  const proExpiresAt = new Date(
    Date.now() + 30 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { error: profileError } = await admin
    .from("profiles")
    .update({ is_pro: true, pro_expires_at: proExpiresAt })
    .eq("id", payment.profile_id);

  if (profileError) {
    console.error("[webhook] profile update error", profileError);
    return new Response("DB error", { status: 500 });
  }

  console.log(
    `[webhook] Pro activated for profile ${payment.profile_id}, inv_id=${invId}`,
  );

  return new Response(`OK${invId}`, {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
}
