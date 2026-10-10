import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabaseServer";
import { buildProfileShortUrl } from "@/lib/profileShare";

export const runtime = "nodejs";

type Body = {
  profile_id?: string;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  const profileId = body.profile_id?.trim() ?? "";
  if (!UUID_RE.test(profileId)) {
    return NextResponse.json({ error: "Некорректный profile_id" }, { status: 400 });
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

  const { data: code, error } = await sb.rpc("get_or_create_profile_share_code", {
    p_profile_id: profileId,
  });

  if (error) {
    console.error("[share-link] rpc error:", error);
    const message =
      error.message.includes("profile not found")
        ? "Профиль не найден"
        : "Не удалось создать ссылку";
    const status = error.message.includes("profile not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }

  if (!code || typeof code !== "string") {
    return NextResponse.json({ error: "Не удалось создать ссылку" }, { status: 500 });
  }

  return NextResponse.json({
    code,
    url: buildProfileShortUrl(code),
  });
}
