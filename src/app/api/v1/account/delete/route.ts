import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabaseAdmin";
import { createSupabaseRouteClient } from "@/lib/supabaseServer";

const DELETED_DISPLAY_NAME = "Удалённый пользователь";

/**
 * Soft delete профиля + anonymize ПД + удаление push + auth.admin.deleteUser.
 * Сообщения в чатах остаются; собеседники видят «Удалённый пользователь».
 * subscription_payments не трогаем.
 */
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
    .select("id, deleted_at")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("[account/delete] profile lookup", profileError);
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  if (!profile?.id) {
    return NextResponse.json({ error: "Профиль не найден" }, { status: 404 });
  }

  if (profile.deleted_at) {
    return NextResponse.json({ error: "Аккаунт уже удалён" }, { status: 409 });
  }

  const profileId = profile.id as string;
  const now = new Date().toISOString();

  const { error: softErr } = await admin
    .from("profiles")
    .update({
      deleted_at: now,
      map_visible: false,
      full_name: DELETED_DISPLAY_NAME,
      age: null,
      city: null,
      industry: null,
      industry_other: null,
      subindustry: null,
      role_title: null,
      experience_years: null,
      skills: null,
      looking_for: null,
      resources: null,
      can_help_with: null,
      interested_in: null,
      current_status: null,
      is_pro: false,
      pro_expires_at: null,
      auth_user_id: null,
    })
    .eq("id", profileId);

  if (softErr) {
    console.error("[account/delete] soft delete", softErr);
    return NextResponse.json({ error: softErr.message }, { status: 500 });
  }

  await admin.from("locations").update({ is_active: false }).eq("user_id", profileId);

  await admin.from("profile_private").delete().eq("profile_id", profileId);

  await admin.from("push_subscriptions").delete().eq("profile_id", profileId);

  const { error: authDelErr } = await admin.auth.admin.deleteUser(user.id);
  if (authDelErr) {
    console.error("[account/delete] auth delete", authDelErr);
    return NextResponse.json(
      {
        error:
          "Профиль скрыт, но удаление входа не завершено. Напишите в поддержку.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
