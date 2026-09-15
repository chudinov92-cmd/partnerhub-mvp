import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabaseServer";
import { lookupAccountForModeration } from "@/app/api/admin/users/_lib/resolveModerationQuery";
import { requireSuperAdmin } from "@/app/api/admin/users/_lib/requireSuperAdmin";

export async function GET(req: Request) {
  try {
    const auth = await requireSuperAdmin();
    if (!auth.ok) return auth.response;

    const url = new URL(req.url);
    const query = url.searchParams.get("query")?.trim() ?? "";
    if (!query) {
      return NextResponse.json({ error: "Ожидался query" }, { status: 400 });
    }

    const adminSb = createSupabaseAdminClient();
    const result = await lookupAccountForModeration(adminSb, query);
    if (!result.found) {
      return NextResponse.json(
        { found: false, error: result.error ?? "Не найдено" },
        { status: 404 },
      );
    }

    return NextResponse.json(result);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    if (msg.includes("SUPABASE_SERVICE_ROLE_KEY")) {
      return NextResponse.json(
        { error: "Сервер: не задан SUPABASE_SERVICE_ROLE_KEY" },
        { status: 500 },
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireSuperAdmin();
    if (!auth.ok) return auth.response;

    let body: { query?: string };
    try {
      body = (await req.json()) as { query?: string };
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const query = typeof body.query === "string" ? body.query.trim() : "";
    if (!query) {
      return NextResponse.json({ error: "Ожидался query" }, { status: 400 });
    }

    const adminSb = createSupabaseAdminClient();
    const result = await lookupAccountForModeration(adminSb, query);
    if (!result.found) {
      return NextResponse.json(
        { found: false, error: result.error ?? "Не найдено" },
        { status: 404 },
      );
    }

    return NextResponse.json(result);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    if (msg.includes("SUPABASE_SERVICE_ROLE_KEY")) {
      return NextResponse.json(
        { error: "Сервер: не задан SUPABASE_SERVICE_ROLE_KEY" },
        { status: 500 },
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
