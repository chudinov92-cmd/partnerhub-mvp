import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabaseServer";
import {
  getClientIpFromRequest,
  isSupportedConsentType,
  isSupportedPolicyVersion,
  isValidUuid,
  maskIpAddress,
} from "@/lib/cookieConsent";

export const runtime = "nodejs";

type Body = {
  anonymous_uid?: string;
  policy_version?: string;
  consent_type?: string;
};

/** Публичный лог согласия с Cookie-политикой для гостей. */
export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const anonymousUid =
    typeof body.anonymous_uid === "string" ? body.anonymous_uid.trim() : "";
  const policyVersion =
    typeof body.policy_version === "string" ? body.policy_version.trim() : "";
  const consentType =
    typeof body.consent_type === "string" ? body.consent_type.trim() : "";

  if (!isValidUuid(anonymousUid)) {
    return NextResponse.json({ error: "Invalid anonymous_uid" }, { status: 400 });
  }

  if (!isSupportedPolicyVersion(policyVersion)) {
    return NextResponse.json({ error: "Invalid policy_version" }, { status: 400 });
  }

  if (!isSupportedConsentType(consentType)) {
    return NextResponse.json({ error: "Invalid consent_type" }, { status: 400 });
  }

  const rawIp = getClientIpFromRequest(req);
  const ipAddress = rawIp ? maskIpAddress(rawIp) : null;
  const userAgent = req.headers.get("user-agent");

  try {
    const admin = createSupabaseAdminClient();
    const { error } = await admin.from("cookie_consent_logs").insert({
      anonymous_uid: anonymousUid,
      policy_version: policyVersion,
      consent_type: consentType,
      ip_address: ipAddress,
      user_agent: userAgent,
    });

    if (error) {
      console.error("[privacy/cookie-consent]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
