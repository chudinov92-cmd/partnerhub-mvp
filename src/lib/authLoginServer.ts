import { createSupabaseAdminClient } from "@/lib/supabaseServer";
import { clientIpFromRequest } from "@/lib/authOtpSendServer";
import {
  isPlausibleLoginEmail,
  loginLimitMessage,
  normalizeLoginEmail,
  parseLoginReason,
  type LoginLimitResult,
  type LoginReason,
} from "@/lib/authLoginRateLimit";

export type LoginRpcRow = {
  allowed?: unknown;
  reason?: unknown;
  retry_after_seconds?: unknown;
  email_fails_window?: unknown;
  ip_fails_window?: unknown;
  id?: unknown;
};

export function parseLoginRpc(data: unknown): LoginLimitResult {
  let payload: unknown = data;
  if (typeof payload === "string") {
    try {
      payload = JSON.parse(payload) as unknown;
    } catch {
      payload = {};
    }
  }
  const row = (payload && typeof payload === "object" ? payload : {}) as LoginRpcRow;
  const allowed = row.allowed === true;
  const reason = parseLoginReason(row.reason);
  const retryAfterSeconds =
    typeof row.retry_after_seconds === "number"
      ? Math.max(0, Math.ceil(row.retry_after_seconds))
      : 0;
  const emailFailsWindow =
    typeof row.email_fails_window === "number" ? row.email_fails_window : 0;
  const ipFailsWindow =
    typeof row.ip_fails_window === "number" ? row.ip_fails_window : 0;
  const id = typeof row.id === "string" ? row.id : undefined;
  return {
    allowed,
    reason: allowed ? (reason === "ok" ? "ok" : reason) : reason,
    retryAfterSeconds,
    emailFailsWindow,
    ipFailsWindow,
    id,
  };
}

export class AuthLoginUnavailableError extends Error {
  constructor() {
    super("Вход временно недоступен. Попробуйте через минуту.");
    this.name = "AuthLoginUnavailableError";
  }
}

export function isAuthLoginUnavailableError(
  err: unknown,
): err is AuthLoginUnavailableError {
  return err instanceof AuthLoginUnavailableError;
}

export async function tryAuthLogin(params: {
  email: string;
  ip: string | null;
  success?: boolean;
  dryRun: boolean;
}): Promise<LoginLimitResult> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc("try_auth_login", {
    p_email: normalizeLoginEmail(params.email),
    p_ip: params.ip ?? "",
    p_success: params.success ?? false,
    p_dry_run: params.dryRun,
  });
  if (error) {
    const text = `${error.message} ${error.code ?? ""}`;
    if (/try_auth_login|does not exist|schema cache|PGRST202/i.test(text)) {
      console.error("[auth/login] RPC недоступен, вход закрыт", error);
      throw new AuthLoginUnavailableError();
    }
    throw error;
  }
  return parseLoginRpc(data);
}

export function validateLoginEmail(email: unknown): string | null {
  if (typeof email !== "string" || !isPlausibleLoginEmail(email)) {
    return null;
  }
  return normalizeLoginEmail(email);
}

export function loginLimitedJson(result: LoginLimitResult) {
  const reason: LoginReason =
    result.reason === "ok" ? "email_lockout" : result.reason;
  return {
    status: 429 as const,
    body: {
      allowed: false,
      reason,
      retry_after_seconds: result.retryAfterSeconds,
      message: loginLimitMessage(reason, result.retryAfterSeconds),
    },
  };
}

export function mapGoTrueLoginError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("email not confirmed") || m.includes("email not verified")) {
    return "Подтвердите email — проверьте почту или запросите код повторно.";
  }
  if (
    m.includes("invalid login credentials") ||
    m.includes("invalid email or password") ||
    m.includes("wrong password")
  ) {
    return "Неверный логин или пароль";
  }
  return "Неверный логин или пароль";
}

export { clientIpFromRequest };
