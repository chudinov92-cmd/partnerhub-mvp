import { NextResponse } from "next/server";
import {
  authOtpRedirectOrigin,
  clientIpFromRequest,
  limitedJson,
  okJson,
  otpEmailRedirectTo,
  purposeFromKind,
  releaseOtpSend,
  sendGoTrueOtp,
  tryAuthOtpSend,
  validateOtpSendEmail,
} from "@/lib/authOtpSendServer";
import type { OtpSendKind } from "@/lib/authOtpRateLimit";

export const runtime = "nodejs";

const KINDS: readonly OtpSendKind[] = [
  "signup",
  "signup_resend",
  "recovery",
  "record",
];

function isOtpSendKind(value: string): value is OtpSendKind {
  return (KINDS as readonly string[]).includes(value);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const email = validateOtpSendEmail(url.searchParams.get("email") ?? "");
  if (!email) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  try {
    const result = await tryAuthOtpSend({
      email,
      ip: clientIpFromRequest(req),
      purpose: "signup",
      dryRun: true,
    });
    if (!result.allowed) {
      const limited = limitedJson(result);
      return NextResponse.json(limited.body);
    }
    return NextResponse.json(okJson(result));
  } catch (err) {
    console.error("[auth/otp-send GET]", err);
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  let body: { email?: unknown; kind?: unknown };
  try {
    body = (await req.json()) as { email?: unknown; kind?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = validateOtpSendEmail(body.email);
  if (!email) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const kindRaw = typeof body.kind === "string" ? body.kind : "";
  if (!isOtpSendKind(kindRaw)) {
    return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
  }

  const ip = clientIpFromRequest(req);
  const purpose = purposeFromKind(kindRaw);

  try {
    const reserved = await tryAuthOtpSend({
      email,
      ip,
      purpose,
      dryRun: kindRaw === "signup",
    });
    if (!reserved.allowed) {
      const limited = limitedJson(reserved);
      return NextResponse.json(limited.body, { status: limited.status });
    }

    if (kindRaw === "signup" || kindRaw === "record") {
      return NextResponse.json(okJson(reserved));
    }

    const origin = authOtpRedirectOrigin(req);
    const { error } = await sendGoTrueOtp(kindRaw, email, origin);
    if (error) {
      await releaseOtpSend(reserved.id);
      console.error("[auth/otp-send GoTrue]", {
        kind: kindRaw,
        message: error.message,
        redirectTo: otpEmailRedirectTo(kindRaw, origin),
      });
      return NextResponse.json(
        { error: error.message || "Не удалось отправить письмо" },
        { status: 502 },
      );
    }

    return NextResponse.json(okJson(reserved));
  } catch (err) {
    console.error("[auth/otp-send POST]", err);
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
