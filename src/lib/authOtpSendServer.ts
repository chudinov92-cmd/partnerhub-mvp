import { createClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabaseServer";
import { getClientIpFromRequest } from "@/lib/cookieConsent";
import {
  isPlausibleOtpEmail,
  normalizeOtpEmail,
  otpSendLimitMessage,
  parseOtpSendReason,
  type OtpSendKind,
  type OtpSendLimitResult,
  type OtpSendReason,
} from "@/lib/authOtpRateLimit";

export type OtpSendRpcRow = {
  allowed?: unknown;
  reason?: unknown;
  retry_after_seconds?: unknown;
  email_sends_24h?: unknown;
  ip_sends_24h?: unknown;
  id?: unknown;
};

export function purposeFromKind(kind: OtpSendKind): "signup" | "recovery" {
  return kind === "recovery" ? "recovery" : "signup";
}

export function parseOtpSendRpc(data: unknown): OtpSendLimitResult {
  let payload: unknown = data;
  if (typeof payload === "string") {
    try {
      payload = JSON.parse(payload) as unknown;
    } catch {
      payload = {};
    }
  }
  const row = (payload && typeof payload === "object" ? payload : {}) as OtpSendRpcRow;
  const allowed = row.allowed === true;
  const reason = parseOtpSendReason(row.reason);
  const retryAfterSeconds =
    typeof row.retry_after_seconds === "number"
      ? Math.max(0, Math.ceil(row.retry_after_seconds))
      : 0;
  const emailSends24h =
    typeof row.email_sends_24h === "number" ? row.email_sends_24h : 0;
  const ipSends24h = typeof row.ip_sends_24h === "number" ? row.ip_sends_24h : 0;
  const id = typeof row.id === "string" ? row.id : undefined;
  return {
    allowed,
    reason: allowed ? (reason === "ok" ? "ok" : reason) : reason,
    retryAfterSeconds,
    emailSends24h,
    ipSends24h,
    id,
  };
}

export async function tryAuthOtpSend(params: {
  email: string;
  ip: string | null;
  purpose: "signup" | "recovery";
  dryRun: boolean;
}): Promise<OtpSendLimitResult> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc("try_auth_otp_send", {
    p_email: normalizeOtpEmail(params.email),
    p_ip: params.ip ?? "",
    p_purpose: params.purpose,
    p_dry_run: params.dryRun,
  });
  if (error) {
    const text = `${error.message} ${error.code ?? ""}`;
    if (/try_auth_otp_send|does not exist|schema cache|PGRST202/i.test(text)) {
      console.error("[auth/otp-send] RPC недоступен, пропускаем лимит", error);
      return {
        allowed: true,
        reason: "ok",
        retryAfterSeconds: 0,
        emailSends24h: 0,
        ipSends24h: 0,
      };
    }
    throw error;
  }
  return parseOtpSendRpc(data);
}

export async function releaseOtpSend(id: string | undefined): Promise<void> {
  if (!id) return;
  try {
    const admin = createSupabaseAdminClient();
    await admin.from("auth_otp_sends").delete().eq("id", id);
  } catch (err) {
    console.error("[auth/otp-send] release failed", err);
  }
}

export function clientIpFromRequest(req: Request): string | null {
  const ip = getClientIpFromRequest(req);
  if (!ip) return null;
  const trimmed = ip.trim();
  if (!trimmed || trimmed === "unknown") return null;
  return trimmed;
}

export function validateOtpSendEmail(email: unknown): string | null {
  if (typeof email !== "string" || !isPlausibleOtpEmail(email)) {
    return null;
  }
  return normalizeOtpEmail(email);
}

export function limitedJson(result: OtpSendLimitResult) {
  const reason: OtpSendReason =
    result.reason === "ok" ? "email_cooldown" : result.reason;
  return {
    status: 429 as const,
    body: {
      allowed: false,
      reason,
      retry_after_seconds: result.retryAfterSeconds,
      message: otpSendLimitMessage(reason, result.retryAfterSeconds),
    },
  };
}

export function okJson(result: OtpSendLimitResult) {
  return {
    allowed: true,
    reason: "ok" as const,
    retry_after_seconds: result.retryAfterSeconds,
    message:
      result.retryAfterSeconds > 0
        ? otpSendLimitMessage("email_cooldown", result.retryAfterSeconds)
        : null,
  };
}

export function createGoTrueFormsClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL или NEXT_PUBLIC_SUPABASE_ANON_KEY не заданы");
  }
  return createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export function authOtpRedirectOrigin(req: Request): string {
  const fromEnv = (
    process.env.NEXT_PUBLIC_EMAIL_AUTH_REDIRECT_ORIGIN ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    ""
  ).replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  const origin = req.headers.get("origin")?.replace(/\/$/, "") ?? "";
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) {
    return origin;
  }
  return "";
}

export function otpEmailRedirectTo(kind: OtpSendKind, origin: string): string | undefined {
  if (!origin.startsWith("http")) return undefined;
  if (kind === "recovery") return `${origin}/auth/reset-password`;
  return `${origin}/auth/callback`;
}

export async function sendGoTrueOtp(
  kind: "signup_resend" | "recovery",
  email: string,
  origin: string,
): Promise<{ error: { message: string } | null }> {
  const client = createGoTrueFormsClient();
  const redirectTo = otpEmailRedirectTo(kind, origin);
  if (kind === "recovery") {
    const { error } = await client.auth.resetPasswordForEmail(
      email,
      redirectTo ? { redirectTo } : undefined,
    );
    return { error: error ? { message: error.message } : null };
  }
  const { error } = await client.auth.resend({
    type: "signup",
    email,
    options: redirectTo ? { emailRedirectTo: redirectTo } : undefined,
  });
  return { error: error ? { message: error.message } : null };
}
