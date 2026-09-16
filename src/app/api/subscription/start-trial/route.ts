import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabaseServer";
import { createSupabaseAdmin } from "@/lib/supabaseAdmin";
import { TRIAL_ENABLED } from "@/lib/subscriptionTrial";
import { isActiveProProfile } from "@/lib/subscriptionPlans";
import { jsonRouteError } from "@/app/api/_lib/jsonRouteError";

const TRIAL_DAYS = 3;

export async function POST() {
  try {
    const cookieStore = await cookies();
    const sb = createSupabaseRouteClient(cookieStore);

    const {
      data: { user },
      error: authError,
    } = await sb.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    if (!TRIAL_ENABLED) {
      return NextResponse.json(
        { error: "Пробный период больше недоступен" },
        { status: 410 },
      );
    }

    const admin = createSupabaseAdmin();

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("id, is_pro, pro_expires_at, trial_used")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Профиль не найден" }, { status: 404 });
    }

    if (profile.trial_used) {
      return NextResponse.json(
        { error: "Пробный период уже использован" },
        { status: 409 },
      );
    }

    if (isActiveProProfile(profile)) {
      return NextResponse.json(
        { error: "Подписка уже активна" },
        { status: 409 },
      );
    }

    const proExpiresAt = new Date(
      Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();

    const { error: updateError } = await admin
      .from("profiles")
      .update({
        subscription_plan: "pro",
        is_pro: true,
        pro_expires_at: proExpiresAt,
        trial_used: true,
      })
      .eq("id", profile.id);

    if (updateError) {
      console.error("[start-trial] update error", updateError);
      return NextResponse.json(
        { error: "Не удалось активировать пробный период" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      proExpiresAt,
    });
  } catch (err) {
    return jsonRouteError("[start-trial]", err);
  }
}
