import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  createSupabaseAdminClient,
  createSupabaseRouteClient,
} from "@/lib/supabaseServer";
import { isActiveProProfile } from "@/services/subscriptionService";

export const runtime = "nodejs";

type Body = {
  target_profession?: string;
  city_context?: string;
  filters_json?: Record<string, unknown> | null;
};

/** Запись события «Поиск» на карте (profession обязательна). Гости и авторизованные. */
export async function POST(req: Request) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const targetProfession =
    typeof body.target_profession === "string"
      ? body.target_profession.trim()
      : "";
  const cityContext =
    typeof body.city_context === "string" ? body.city_context.trim() : "";

  if (!targetProfession || !cityContext) {
    return NextResponse.json(
      { error: "target_profession and city_context required" },
      { status: 400 },
    );
  }

  const filtersJson =
    body.filters_json && typeof body.filters_json === "object"
      ? body.filters_json
      : null;

  let profileId: string | null = null;
  let seekerRole: string | null = null;
  let country: string | null = null;
  let age: number | null = null;
  let isPro: boolean | null = null;
  let isAuthenticated = false;

  try {
    const cookieStore = await cookies();
    const sb = createSupabaseRouteClient(cookieStore);
    const {
      data: { user },
    } = await sb.auth.getUser();

    if (user) {
      const admin = createSupabaseAdminClient();
      const { data: profile } = await admin
        .from("profiles")
        .select("id, role_title, country, age, is_pro, pro_expires_at")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (profile) {
        isAuthenticated = true;
        profileId = profile.id as string;
        seekerRole = (profile.role_title as string | null)?.trim() || null;
        country = (profile.country as string | null)?.trim() || null;
        age = typeof profile.age === "number" ? profile.age : null;
        isPro = isActiveProProfile(profile);
      }
    }

    const admin = createSupabaseAdminClient();
    const { error } = await admin.from("map_search_events").insert({
      profile_id: profileId,
      is_authenticated: isAuthenticated,
      seeker_role: seekerRole,
      target_profession: targetProfession,
      city_context: cityContext,
      country,
      age,
      is_pro: isPro,
      filters_json: filtersJson,
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
