import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  emailMapLink,
  pluralContacts,
  wrapTransactionalEmail,
} from "@/lib/emailContent";
import {
  sendTransactionalEmail,
  verifyInternalEmailSecret,
} from "@/lib/emailServer";

type CityGrowthBatch = {
  city: string;
  new_count: number;
};

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export async function POST(req: Request) {
  if (!verifyInternalEmailSecret(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createSupabaseAdmin();
  const now = new Date();
  const weekAgoIso = new Date(now.getTime() - WEEK_MS).toISOString();
  const mapUrl = emailMapLink("city_growth");

  const { data: batches, error: batchErr } = await admin.rpc(
    "get_city_growth_email_batches",
  );

  if (batchErr) {
    return NextResponse.json({ error: batchErr.message }, { status: 500 });
  }

  let sent = 0;
  let skipped = 0;

  for (const batch of (batches ?? []) as CityGrowthBatch[]) {
    const city = batch.city?.trim();
    const newCount = Number(batch.new_count ?? 0);

    if (!city || newCount < 50) {
      continue;
    }

    const { data: recipients, error: recipientsErr } = await admin
      .from("profiles")
      .select("id, auth_user_id, created_at, last_city_growth_email_at")
      .eq("city", city)
      .not("auth_user_id", "is", null)
      .lte("created_at", weekAgoIso);

    if (recipientsErr) {
      return NextResponse.json({ error: recipientsErr.message }, { status: 500 });
    }

    for (const row of recipients ?? []) {
      const profileId = row.id as string;
      const authUserId = row.auth_user_id as string;
      const createdAt = new Date(String(row.created_at));
      const lastSent = row.last_city_growth_email_at
        ? new Date(String(row.last_city_growth_email_at))
        : null;

      const weekAnchor = lastSent ?? createdAt;
      const nextEligibleAt = new Date(weekAnchor.getTime() + WEEK_MS);

      if (now < nextEligibleAt) {
        skipped += 1;
        continue;
      }

      const { data: authUser, error: authErr } =
        await admin.auth.admin.getUserById(authUserId);
      if (authErr || !authUser.user?.email) {
        skipped += 1;
        continue;
      }

      const word = pluralContacts(newCount);
      const subject = `${newCount} новых ${word} в вашем городе — Zeip`;
      const lead = `На этой неделе в ${city} появилось ${newCount} новых ${word}. Откройте карту и познакомьтесь с новыми людьми рядом.`;

      const result = await sendTransactionalEmail({
        to: authUser.user.email,
        subject,
        text: `${lead} ${mapUrl}`,
        html: wrapTransactionalEmail({
          title: `${newCount} новых ${word} в вашем городе`,
          lead,
          ctaLabel: "Открыть карту",
          ctaHref: mapUrl,
        }),
      });

      if (!result.ok) {
        skipped += 1;
        continue;
      }

      const { error: updateErr } = await admin
        .from("profiles")
        .update({ last_city_growth_email_at: now.toISOString() })
        .eq("id", profileId);

      if (updateErr) {
        skipped += 1;
        continue;
      }

      sent += 1;
    }
  }

  return NextResponse.json({ ok: true, sent, skipped });
}
