import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabaseServer";
import { createSupabaseAdmin } from "@/lib/supabaseAdmin";

const TRIAL_DAYS = 3;

function isActiveProProfile(row: {
  is_pro?: boolean | null;
  pro_expires_at?: string | null;
}): boolean {
  if (!row) return false;
  const expiresAt = row.pro_expires_at ?? null;
  const isProFlag = Boolean(row.is_pro);
  const notExpired =
    !expiresAt || new Date(expiresAt).getTime() > Date.now();
  return isProFlag && notExpired;
}

export async function POST() {
  const cookieStore = await cookies();
  const sb = createSupabaseRouteClient(cookieStore);

  const {
    data: { user },
    error: authError,
  } = await sb.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
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

  if (
    isActiveProProfile({
      is_pro: profile.is_pro,
      pro_expires_at: profile.pro_expires_at,
    })
  ) {
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
}
