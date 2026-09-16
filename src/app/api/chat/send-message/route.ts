import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getProfileIdFromAccessToken } from "@/lib/authProfile";
import { dispatchPushForMessage } from "@/lib/pushDispatchServer";
import { jsonRouteError } from "@/app/api/_lib/jsonRouteError";

type SendMessageBody = {
  chat_id?: string;
  content?: string;
};

function bearerToken(req: Request): string | null {
  const h = req.headers.get("authorization");
  if (!h?.startsWith("Bearer ")) return null;
  return h.slice("Bearer ".length).trim();
}

function userSupabase(accessToken: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("Missing Supabase public env");
  }
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

/** INSERT в messages под RLS отправителя + Web Push получателям на сервере. */
export async function POST(req: Request) {
  try {
    const token = bearerToken(req);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profileId = await getProfileIdFromAccessToken(token);
    if (!profileId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: SendMessageBody;
    try {
      body = (await req.json()) as SendMessageBody;
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const chatId = typeof body.chat_id === "string" ? body.chat_id.trim() : "";
    const content =
      typeof body.content === "string" ? body.content.trim().slice(0, 1000) : "";
    if (!chatId || !content) {
      return NextResponse.json({ error: "chat_id and content required" }, { status: 400 });
    }

    const sb = userSupabase(token);

    const { data, error } = await sb
      .from("messages")
      .insert({
        chat_id: chatId,
        sender_id: profileId,
        content,
      })
      .select("id, content, sender_id, created_at, edited_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const messageId = (data as { id: string }).id;
    let pushDelivered = 0;
    try {
      const push = await dispatchPushForMessage(messageId);
      if (push.ok) {
        pushDelivered = push.delivered;
      } else {
        console.error("[send-message] push dispatch", push.error);
      }
    } catch (pushErr) {
      console.error("[send-message] push dispatch unexpected", pushErr);
    }

    return NextResponse.json({
      message: data,
      push_delivered: pushDelivered,
    });
  } catch (err) {
    return jsonRouteError("[send-message]", err);
  }
}
