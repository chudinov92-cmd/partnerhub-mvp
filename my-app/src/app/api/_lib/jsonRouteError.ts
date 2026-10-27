import { NextResponse } from "next/server";

/** Логирует ошибку на сервере; клиенту — нейтральный 500 без утечки env/стека. */
export function jsonRouteError(tag: string, err: unknown): NextResponse {
  console.error(tag, err);
  return NextResponse.json({ error: "Server error" }, { status: 500 });
}
