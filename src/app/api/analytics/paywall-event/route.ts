import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  createSupabaseAdminClient,
  createSupabaseRouteClient,
} from "@/lib/supabaseServer";

export const runtime = "nodejs";

const PAYWALL_EVENT_TYPES = [
  "shown",
  "dismissed",
  "cta_buy",
  "trial_start",
  "checkout_started",
  "payment_success",
] as const;

type PaywallEventType = (typeof PAYWALL_EVENT_TYPES)[number];

type Body = {
  event_type?: string;
  intent?: string;
  plan?: string;
  period?: string;
};

function trimOptionalText(value: unknown, maxLen = 64): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLen);
}

function isPaywallEventType(value: string): value is PaywallEventType {
  return (PAYWALL_EVENT_TYPES as readonly string[]).includes(value);
}

/** Best-effort: логирует событие воронки пейвола (только авторизованные). */
export async function POST(req: Request) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventTypeRaw =
    typeof body.event_type === "string" ? body.event_type.trim() : "";
  if (!eventTypeRaw || !isPaywallEventType(eventTypeRaw)) {
    return NextResponse.json({ error: "Invalid event_type" }, { status: 400 });
  }

  try {
    const cookieStore = await cookies();
    const sb = createSupabaseRouteClient(cookieStore);
    const {
      data: { user },
    } = await sb.auth.getUser();

    if (!user) {
      return NextResponse.json({ ok: true });
    }

    const admin = createSupabaseAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("id, city, subscription_plan")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (!profile?.id) {
      return NextResponse.json({ ok: true });
    }

    const { error } = await admin.from("paywall_events").insert({
      profile_id: profile.id as string,
      event_type: eventTypeRaw,
      intent: trimOptionalText(body.intent),
      plan: trimOptionalText(body.plan),
      period: trimOptionalText(body.period),
      city: trimOptionalText(profile.city as string | null, 128),
      subscription_plan: trimOptionalText(
        profile.subscription_plan as string | null,
      ),
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
