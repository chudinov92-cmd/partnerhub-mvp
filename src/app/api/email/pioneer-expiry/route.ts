import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  isSmtpConfigured,
  sendTransactionalEmail,
  verifyInternalEmailSecret,
} from "@/lib/emailServer";
import { jsonRouteError } from "@/app/api/_lib/jsonRouteError";

export async function POST(req: Request) {
  try {
    if (!verifyInternalEmailSecret(req)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!isSmtpConfigured()) {
      return NextResponse.json(
        { error: "SMTP is not configured" },
        { status: 503 },
      );
    }

    const admin = createSupabaseAdmin();
    const now = new Date();
    const inSevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: profiles, error } = await admin
      .from("profiles")
      .select("id, auth_user_id, pro_expires_at")
      .eq("is_city_pioneer", true)
      .eq("expiry_notified", false)
      .gt("pro_expires_at", now.toISOString())
      .lte("pro_expires_at", inSevenDays)
      .not("auth_user_id", "is", null);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let sent = 0;
    let skipped = 0;

    for (const row of profiles ?? []) {
      const { data: authUser, error: authErr } =
        await admin.auth.admin.getUserById(row.auth_user_id);
      if (authErr || !authUser.user?.email) {
        skipped += 1;
        continue;
      }

      const result = await sendTransactionalEmail({
        to: authUser.user.email,
        subject: "Zeip — бесплатная подписка скоро закончится",
        text: "Ваша бесплатная подписка Zeip истекает через 7 дней. Продлите доступ: https://zeip.ru/subscription",
        html: `<p>Ваша бесплатная подписка Zeip истекает через 7 дней.</p><p><a href="https://zeip.ru/subscription">Продлить за 249 ₽</a></p>`,
      });

      if (!result.ok) {
        console.error("[email/pioneer-expiry] send failed", row.id, result.error);
        skipped += 1;
        continue;
      }

      const { error: updateErr } = await admin
        .from("profiles")
        .update({ expiry_notified: true })
        .eq("id", row.id);

      if (updateErr) {
        console.error("[email/pioneer-expiry] update flag", row.id, updateErr);
        skipped += 1;
        continue;
      }

      sent += 1;
    }

    return NextResponse.json({ ok: true, sent, skipped });
  } catch (e) {
    return jsonRouteError("[email/pioneer-expiry]", e);
  }
}
