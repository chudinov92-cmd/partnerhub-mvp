import { NextResponse } from "next/server";
import { dispatchPushForMessage } from "@/lib/pushDispatchServer";

type DispatchBody = {
  message_id?: string;
};

export async function POST(req: Request) {
  const secret = req.headers.get("x-internal-secret");
  const expected = process.env.INTERNAL_PUSH_SECRET;

  if (!expected || secret !== expected) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: DispatchBody;
  try {
    body = (await req.json()) as DispatchBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const messageId =
    typeof body.message_id === "string" ? body.message_id.trim() : "";

  const result = await dispatchPushForMessage(messageId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ ok: true, delivered: result.delivered });
}
