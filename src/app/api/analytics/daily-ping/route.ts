import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  createSupabaseAdminClient,
  createSupabaseRouteClient,
} from "@/lib/supabaseServer";

export const runtime = "nodejs";

/** Best-effort: фиксирует активность пользователя за текущий UTC-день. */
export async function POST() {
  try {
    const cookieStore = await cookies();
    const sb = createSupabaseRouteClient(cookieStore);
    const {
      data: { user },
    } = await sb.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const today = new Date().toISOString().slice(0, 10);
    const admin = createSupabaseAdminClient();

    const { data: profile } = await admin
      .from("profiles")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (!profile?.id) {
      return NextResponse.json({ ok: true });
    }

    const { error } = await admin.from("user_daily_activity").upsert(
      { profile_id: profile.id as string, day: today },
      { onConflict: "profile_id,day", ignoreDuplicates: true },
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
