import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@my-startup/auth";
import { jsonRouteError } from "@/app/api/_lib/jsonRouteError";
import {
  emailMapChatLink,
  messagePreviewHtml,
  truncateEmailText,
  wrapTransactionalEmail,
} from "@my-startup/notifications";
import {
  isSmtpConfigured,
  sendTransactionalEmail,
  verifyInternalEmailSecret,
} from "@my-startup/notifications/server";

type MessageEmailCandidate = {
  profile_id: string;
  auth_user_id: string;
  peer_profile_id: string;
  sender_name: string;
  sender_role_title: string | null;
  message_content: string;
  message_created_at: string;
};

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
    const peerProfileId = row.peer_profile_id;

    if (!profileId || !authUserId || !peerProfileId) {
      skipped += 1;
      continue;
    }

    const senderName = (row.sender_name ?? "Пользователь").trim() || "Пользователь";
    const senderRoleTitle = row.sender_role_title?.trim() || null;
    const messageText = truncateEmailText(row.message_content ?? "");

    const mapUrl = emailMapChatLink(peerProfileId, "new_message");

    const { data: authUser, error: authErr } =
      await admin.auth.admin.getUserById(authUserId);
    if (authErr || !authUser.user?.email) {
      skipped += 1;
      continue;
    }

    const email = authUser.user.email;

    const lead = `${senderName} написал(а) вам сообщение. Войдите, чтобы ответить.`;
    const text = `${lead}\n\n${senderName}${messageText ? `\n${messageText}` : ""}\n\nОткрыть чат: ${mapUrl}`;

    const result = await sendTransactionalEmail({
      to: email,
      subject: "У вас новое сообщение",
      text,
      html: wrapTransactionalEmail({
        title: "У вас новое сообщение",
        lead,
        extraHtml: messagePreviewHtml({
          senderName,
          senderRoleTitle,
          messageText,
        }),
        ctaLabel: "Открыть чат",
        ctaHref: mapUrl,
      }),
    });

    if (!result.ok) {
      console.error("[email/new-message] send failed", profileId, result.error);
      skipped += 1;
      continue;
    }

    // Лимит 24 ч на пару (получатель, отправитель)
    const { error: insertErr } = await admin.from("message_email_log").upsert(
      { profile_id: profileId, peer_profile_id: peerProfileId, sent_at: new Date().toISOString() },
      { onConflict: "profile_id,peer_profile_id" },
    );

    if (insertErr) {
      console.error("[email/new-message] log write", profileId, insertErr);
      skipped += 1;
      continue;
    }

    sent += 1;
  }

  return NextResponse.json({ ok: true, sent, skipped });
  } catch (e) {
    return jsonRouteError("[email/new-message]", e);
  }
}
