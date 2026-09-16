import {
  getRobokassaPassword2,
  signResultWebhook,
} from "@/lib/robokassa";
import { createSupabaseAdmin } from "@/lib/supabaseAdmin";

type ApplyPaymentRow = {
  result: string;
  profile_id: string | null;
  plan: string | null;
};

/**
 * Robokassa Result URL (POST).
 * Ответ должен быть точно: OK{InvId}
 */
export async function POST(req: Request) {
  try {
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

    const { data, error } = await admin.rpc("apply_robokassa_payment", {
      p_inv_id: invId,
      p_paid_at: new Date().toISOString(),
    });

    if (error) {
      console.error("[webhook] RPC apply_robokassa_payment", invId, error);
      return new Response("DB error", { status: 500 });
    }

    const row = (Array.isArray(data) ? data[0] : data) as
      | ApplyPaymentRow
      | null
      | undefined;
    const outcome = row?.result ?? "not_found";

    if (outcome === "not_found") {
      console.error("[webhook] payment not found", invId);
      return new Response("Payment not found", { status: 404 });
    }

    if (outcome === "unknown_plan") {
      console.error("[webhook] unknown plan", invId, row?.plan);
      return new Response("Unknown plan", { status: 500 });
    }

    if (
      outcome === "applied" ||
      outcome === "already_paid" ||
      outcome === "repaired"
    ) {
      if (outcome === "applied") {
        console.log(
          `[webhook] subscription activated profile=${row?.profile_id} inv_id=${invId} plan=${row?.plan}`,
        );
      } else if (outcome === "repaired") {
        console.log(
          `[webhook] profile repaired after paid inv_id=${invId} profile=${row?.profile_id}`,
        );
      }
      return new Response(`OK${invId}`, {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      });
    }

    console.error("[webhook] unexpected RPC result", invId, outcome);
    return new Response("DB error", { status: 500 });
  } catch (err) {
    console.error("[webhook] unexpected", err);
    return new Response("Server error", { status: 500 });
  }
}
