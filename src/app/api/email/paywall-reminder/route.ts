import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabaseAdmin";
import { isLocalReminderWindow } from "@/data/cityTimezones";
import {
  sendTransactionalEmail,
  verifyInternalEmailSecret,
} from "@/lib/emailServer";

export async function POST(req: Request) {
  if (!verifyInternalEmailSecret(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createSupabaseAdmin();
  const now = new Date();
  const cutoff = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();

  const { data: profiles, error } = await admin
    .from("profiles")
    .select("id, city, auth_user_id")
    .eq("onboarding_completed", true)
    .eq("is_pro", false)
    .eq("reminder_sent", false)
    .lt("created_at", cutoff)
    .not("auth_user_id", "is", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let sent = 0;
  let skipped = 0;

  for (const row of profiles ?? []) {
    if (!isLocalReminderWindow(row.city, now)) {
      skipped += 1;
      continue;
    }

    const { data: authUser, error: authErr } =
      await admin.auth.admin.getUserById(row.auth_user_id);
    if (authErr || !authUser.user?.email) {
      skipped += 1;
      continue;
    }

    const email = authUser.user.email;
    const result = await sendTransactionalEmail({
      to: email,
      subject: "Zeip — продолжите знакомство с картой",
      text: "Вы зарегистрировались в Zeip, но ещё не оформили подписку. Откройте карту и найдите людей рядом: https://zeip.ru/map",
      html: `<p>Вы зарегистрировались в Zeip, но ещё не оформили подписку.</p><p><a href="https://zeip.ru/map">Открыть карту</a></p>`,
    });

    if (!result.ok) {
      skipped += 1;
      continue;
    }

    await admin
      .from("profiles")
      .update({ reminder_sent: true })
      .eq("id", row.id);
    sent += 1;
  }

  return NextResponse.json({ ok: true, sent, skipped });
}
