import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  emailMapLink,
  wrapTransactionalEmail,
} from "@/lib/emailContent";
import {
  sendTransactionalEmail,
  verifyInternalEmailSecret,
} from "@/lib/emailServer";

type MessageEmailCandidate = {
  profile_id: string;
  auth_user_id: string;
};

export async function POST(req: Request) {
  if (!verifyInternalEmailSecret(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createSupabaseAdmin();
  const mapUrl = emailMapLink("new_message");

  const { data: candidates, error } = await admin.rpc(
    "get_profiles_for_message_email",
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let sent = 0;
  let skipped = 0;

  for (const row of (candidates ?? []) as MessageEmailCandidate[]) {
    const profileId = row.profile_id;
    const authUserId = row.auth_user_id;

    if (!profileId || !authUserId) {
      skipped += 1;
      continue;
    }

    const { data: authUser, error: authErr } =
      await admin.auth.admin.getUserById(authUserId);
    if (authErr || !authUser.user?.email) {
      skipped += 1;
      continue;
    }

    const email = authUser.user.email;
    const result = await sendTransactionalEmail({
      to: email,
      subject: "У вас новое сообщение",
      text: `У вас новое личное сообщение. Войдите, чтобы ответить: ${mapUrl}`,
      html: wrapTransactionalEmail({
        title: "У вас новое сообщение",
        lead: "У вас новое личное сообщение. Войдите, чтобы ответить.",
        ctaLabel: "Открыть сообщения",
        ctaHref: mapUrl,
      }),
    });

    if (!result.ok) {
      skipped += 1;
      continue;
    }

    const { error: updateErr } = await admin
      .from("profiles")
      .update({ last_message_email_at: new Date().toISOString() })
      .eq("id", profileId);

    if (updateErr) {
      skipped += 1;
      continue;
    }

    sent += 1;
  }

  return NextResponse.json({ ok: true, sent, skipped });
}
