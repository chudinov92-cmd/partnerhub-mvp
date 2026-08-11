import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabaseServer";
import { createSupabaseAdmin } from "@/lib/supabaseAdmin";

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

export async function GET(req: Request) {
  const url = new URL(req.url);
  const invIdRaw = url.searchParams.get("invId");
  if (!invIdRaw?.trim()) {
    return NextResponse.json({ error: "invId обязателен" }, { status: 400 });
  }

  const invId = Number.parseInt(invIdRaw, 10);
  if (!Number.isFinite(invId)) {
    return NextResponse.json({ error: "Некорректный invId" }, { status: 400 });
  }

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
    .select("id, is_pro, pro_expires_at")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return NextResponse.json({ error: "Профиль не найден" }, { status: 404 });
  }

  const { data: payment, error: paymentError } = await admin
    .from("subscription_payments")
    .select("id, profile_id, status, paid_at")
    .eq("inv_id", invId)
    .maybeSingle();

  if (paymentError || !payment) {
    return NextResponse.json({ error: "Платёж не найден" }, { status: 404 });
  }

  if (payment.profile_id !== profile.id) {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  const proActive = isActiveProProfile(profile);
  const paid = payment.status === "paid" || proActive;

  return NextResponse.json({
    status: paid ? "paid" : "pending",
    isPro: proActive,
    proExpiresAt: profile.pro_expires_at ?? null,
  });
}
