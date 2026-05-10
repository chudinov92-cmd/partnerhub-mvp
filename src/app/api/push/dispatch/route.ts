import { NextResponse } from "next/server";
import webpush from "web-push";
import { createSupabaseAdmin } from "@/lib/supabaseAdmin";

type DispatchBody = {
  message_id?: string;
};

function ensureVapid() {
  const subject = process.env.VAPID_SUBJECT;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!subject || !pub || !priv) {
    throw new Error("Missing VAPID_SUBJECT / VAPID keys");
  }
  webpush.setVapidDetails(subject, pub, priv);
}

export async function POST(req: Request) {
  const secret = req.headers.get("x-internal-secret");
  const expected = process.env.INTERNAL_PUSH_SECRET;

  if (!expected || secret !== expected) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: DispatchBody;
  try {
    body = (await req.json()) as DispatchBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const messageId =
    typeof body.message_id === "string" ? body.message_id.trim() : "";
  if (!messageId) {
    return NextResponse.json({ error: "message_id required" }, { status: 400 });
  }

  try {
    ensureVapid();
  } catch (e) {
    console.error("[push/dispatch] VAPID", e);
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const admin = createSupabaseAdmin();

  const { data: msg, error: msgErr } = await admin
    .from("messages")
    .select("id, chat_id, sender_id")
    .eq("id", messageId)
    .maybeSingle();

  if (msgErr || !msg?.chat_id || !msg.sender_id) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }

  const chatId = msg.chat_id as string;
  const senderId = msg.sender_id as string;

  const { data: senderRow, error: sendErr } = await admin
    .from("profiles")
    .select("full_name, role_title")
    .eq("id", senderId)
    .maybeSingle();

  if (sendErr) {
    console.error("[push/dispatch] sender", sendErr);
  }

  const fullName =
    typeof senderRow?.full_name === "string" ? senderRow.full_name.trim() : "";
  const roleTitle =
    typeof senderRow?.role_title === "string" ? senderRow.role_title.trim() : "";

  const title =
    fullName !== "" ? fullName : "Новое сообщение в zeip";
  const bodyText =
    roleTitle !== ""
      ? `${roleTitle} · Новое сообщение`
      : "Новое сообщение";

  const payload = JSON.stringify({
    title,
    body: bodyText,
    profileId: senderId,
  });

  const { data: members, error: memErr } = await admin
    .from("chat_members")
    .select("user_id")
    .eq("chat_id", chatId);

  if (memErr || !members?.length) {
    return NextResponse.json({ ok: true, delivered: 0 });
  }

  const recipientIds = members
    .map((m: { user_id: string }) => m.user_id)
    .filter((id: string) => id && id !== senderId);

  if (!recipientIds.length) {
    return NextResponse.json({ ok: true, delivered: 0 });
  }

  const { data: blocks, error: blockErr } = await admin
    .from("profile_blocks")
    .select("owner_id")
    .eq("blocked_profile_id", senderId)
    .in("owner_id", recipientIds);

  if (blockErr) {
    console.error("[push/dispatch] blocks", blockErr);
  }

  const blockedOwners = new Set(
    (blocks as { owner_id: string }[] | null)?.map((b) => b.owner_id) ?? [],
  );
  const allowedRecipients = recipientIds.filter((id) => !blockedOwners.has(id));

  if (!allowedRecipients.length) {
    return NextResponse.json({ ok: true, delivered: 0 });
  }

  const { data: subs, error: subErr } = await admin
    .from("push_subscriptions")
    .select("id, profile_id, endpoint, p256dh, auth_key")
    .in("profile_id", allowedRecipients);

  if (subErr) {
    console.error("[push/dispatch] subs", subErr);
    return NextResponse.json({ error: subErr.message }, { status: 500 });
  }

  let delivered = 0;
  const rows = (subs ?? []) as {
    id: string;
    profile_id: string;
    endpoint: string;
    p256dh: string;
    auth_key: string;
  }[];

  for (const row of rows) {
    const pushSub = {
      endpoint: row.endpoint,
      keys: { p256dh: row.p256dh, auth: row.auth_key },
    };
    try {
      await webpush.sendNotification(pushSub, payload, {
        TTL: 60,
        urgency: "high",
      });
      delivered += 1;
      await admin
        .from("push_subscriptions")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", row.id);
    } catch (e: unknown) {
      const statusCode =
        e && typeof e === "object" && "statusCode" in e
          ? (e as { statusCode?: number }).statusCode
          : undefined;
      if (statusCode === 404 || statusCode === 410) {
        await admin.from("push_subscriptions").delete().eq("id", row.id);
      } else {
        console.warn("[push/dispatch] send failed", row.id, e);
      }
    }
  }

  return NextResponse.json({ ok: true, delivered });
}
