import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabaseServer";
import {
  buildProfileMapSharePath,
  PROFILE_SHARE_CODE_REGEX,
} from "@/lib/profileShare";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ code: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { code: rawCode } = await context.params;
  const code = rawCode?.trim() ?? "";

  if (!PROFILE_SHARE_CODE_REGEX.test(code)) {
    return new NextResponse("Ссылка не найдена", { status: 404 });
  }

  try {
    const admin = createSupabaseAdminClient();
    const { data: profileId, error } = await admin.rpc(
      "resolve_profile_share_code",
      { p_code: code },
    );

    if (error) {
      console.error("[p/code] resolve error:", error);
      return new NextResponse("Ошибка сервера", { status: 500 });
    }

    if (!profileId || typeof profileId !== "string") {
      return new NextResponse("Ссылка не найдена", { status: 404 });
    }

    return NextResponse.redirect(
      new URL(buildProfileMapSharePath(profileId), request.url),
      302,
    );
  } catch (e) {
    console.error("[p/code] unexpected:", e);
    return new NextResponse("Ошибка сервера", { status: 500 });
  }
}
