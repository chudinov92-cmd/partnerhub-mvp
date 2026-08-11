import { NextResponse } from "next/server";
import { getProfileIdFromAccessToken } from "@/lib/authProfile";
import { dispatchPushForMessage } from "@/lib/pushDispatchServer";
import { createSupabaseAdmin } from "@/lib/supabaseAdmin";

type NotifyBody = {
  message_id?: string;
};

function bearerToken(req: Request): string | null {
  const h = req.headers.get("authorization");
  if (!h?.startsWith("Bearer ")) return null;
  return h.slice("Bearer ".length).trim();
}

/**
 * Вызывается клиентом сразу после INSERT в messages.
 * Fallback, если pg_net worker на self-hosted Supabase не обрабатывает очередь.
 */
export async function POST(req: Request) {
  const token = bearerToken(req);
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profileId = await getProfileIdFromAccessToken(token);
  if (!profileId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: NotifyBody;
  try {
    body = (await req.json()) as NotifyBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const messageId =
    typeof body.message_id === "string" ? body.message_id.trim() : "";
  if (!messageId) {
    return NextResponse.json({ error: "message_id required" }, { status: 400 });
  }

  const admin = createSupabaseAdmin();
  const { data: msg, error: msgErr } = await admin
    .from("messages")
    .select("sender_id")
    .eq("id", messageId)
    .maybeSingle();

  if (msgErr || !msg?.sender_id) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }
  if (msg.sender_id !== profileId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await dispatchPushForMessage(messageId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ ok: true, delivered: result.delivered });
}
