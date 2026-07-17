import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  createSupabaseAdminClient,
  createSupabaseRouteClient,
} from "@/lib/supabaseServer";
import { isValidUuid } from "@/lib/cookieConsent";

export const runtime = "nodejs";

type Body = {
  anonymous_uid?: string;
};

/** Привязка анонимного согласия Cookie к профилю авторизованного пользователя. */
export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const anonymousUid =
    typeof body.anonymous_uid === "string" ? body.anonymous_uid.trim() : "";

  if (!isValidUuid(anonymousUid)) {
    return NextResponse.json({ error: "Invalid anonymous_uid" }, { status: 400 });
  }

  try {
    const cookieStore = await cookies();
    const sb = createSupabaseRouteClient(cookieStore);
    const {
      data: { user },
    } = await sb.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createSupabaseAdminClient();
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("[privacy/link-consent profile]", profileError);
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    if (!profile?.id) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const { error } = await admin
      .from("cookie_consent_logs")
      .update({ user_id: profile.id })
      .eq("anonymous_uid", anonymousUid)
      .is("user_id", null);

    if (error) {
      console.error("[privacy/link-consent update]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
