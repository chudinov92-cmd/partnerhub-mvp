import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getProfileIdFromAccessToken } from "@/lib/authProfile";

type SubscribeBody = {
  endpoint?: string;
  keys?: { p256dh?: string; auth?: string };
  expirationTime?: number | null;
};

function bearerToken(req: Request): string | null {
  const h = req.headers.get("authorization");
  if (!h?.startsWith("Bearer ")) return null;
  return h.slice("Bearer ".length).trim();
}

/** Регистрация / статус подписки этого устройства в push_subscriptions. */
export async function GET(req: Request) {
  const token = bearerToken(req);
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const endpoint = url.searchParams.get("endpoint");
  if (!endpoint) {
    return NextResponse.json({ error: "endpoint required" }, { status: 400 });
  }
  const profileId = await getProfileIdFromAccessToken(token);
  if (!profileId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from("push_subscriptions")
    .select("id")
    .eq("profile_id", profileId)
    .eq("endpoint", endpoint)
    .maybeSingle();

  if (error) {
    console.error("[push/subscribe GET]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ registered: !!data });
}

export async function POST(req: Request) {
  const token = bearerToken(req);
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: SubscribeBody;
  try {
    body = (await req.json()) as SubscribeBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const endpoint = typeof body.endpoint === "string" ? body.endpoint.trim() : "";
  const p256dh = typeof body.keys?.p256dh === "string" ? body.keys.p256dh : "";
  const authKey = typeof body.keys?.auth === "string" ? body.keys.auth : "";
  if (!endpoint || !p256dh || !authKey) {
    return NextResponse.json({ error: "Missing subscription keys" }, { status: 400 });
  }

  const profileId = await getProfileIdFromAccessToken(token);
  if (!profileId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ua = req.headers.get("user-agent");

  const admin = createSupabaseAdmin();
  const { error } = await admin.from("push_subscriptions").upsert(
    {
      profile_id: profileId,
      endpoint,
      p256dh,
      auth_key: authKey,
      user_agent: ua,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: "profile_id,endpoint" },
  );

  if (error) {
    console.error("[push/subscribe POST]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const token = bearerToken(req);
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  let endpoint = url.searchParams.get("endpoint");
  if (!endpoint) {
    try {
      const b = (await req.json()) as { endpoint?: string };
      if (typeof b.endpoint === "string") endpoint = b.endpoint;
    } catch {
      /* empty */
    }
  }
  if (!endpoint) {
    return NextResponse.json({ error: "endpoint required" }, { status: 400 });
  }

  const profileId = await getProfileIdFromAccessToken(token);
  if (!profileId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseAdmin();
  const { error } = await admin
    .from("push_subscriptions")
    .delete()
    .eq("profile_id", profileId)
    .eq("endpoint", endpoint);

  if (error) {
    console.error("[push/subscribe DELETE]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
