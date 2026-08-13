import type { EmailOtpType, SupabaseClient } from "@supabase/supabase-js";
import { recoveryTypeInUrl } from "@/lib/authRecovery";

export type AuthEmailCallbackParams = {
  error?: string;
  error_description?: string;
  error_code?: string;
  code?: string;
  access_token?: string;
  refresh_token?: string;
  expires_in?: string;
  token_type?: string;
  type?: string;
  token_hash?: string;
};

export type AuthEmailCallbackKind =
  | "error"
  | "implicit"
  | "pkce_code"
  | "token_hash"
  | "none";

export function getEmailAuthRedirectOrigin(): string {
  const raw =
    (typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_EMAIL_AUTH_REDIRECT_ORIGIN?.trim()
      : "") ?? "";
  if (typeof window !== "undefined") {
    return raw.length > 0 ? raw.replace(/\/$/, "") : window.location.origin;
  }
  return raw.replace(/\/$/, "");
}

export function getEmailAuthCallbackUrl(): string {
  return `${getEmailAuthRedirectOrigin()}/auth/callback`;
}

/** Разбор query + hash после редиректа GoTrue (implicit hash только на клиенте). */
export function parseAuthEmailCallbackParams(
  search: string,
  hash: string,
): AuthEmailCallbackParams {
  const params: AuthEmailCallbackParams = {};
  try {
    const searchParams = new URLSearchParams(search.replace(/^\?/, ""));
    for (const [key, value] of searchParams) {
      if (value) (params as Record<string, string>)[key] = value;
    }
    const hashBody = hash.startsWith("#") ? hash.slice(1) : hash;
    if (hashBody) {
      const hashParams = new URLSearchParams(hashBody);
      for (const [key, value] of hashParams) {
        if (value) (params as Record<string, string>)[key] = value;
      }
    }
  } catch {
    //
  }
  return params;
}

export function hasAuthEmailCallbackParams(
  params: AuthEmailCallbackParams,
): boolean {
  if (params.error || params.error_description) return true;
  if (params.code) return true;
  if (params.access_token && params.refresh_token) return true;
  if (params.token_hash && params.type) return true;
  return false;
}

export function authEmailCallbackPendingInUrl(
  search: string,
  hash: string,
): boolean {
  if (recoveryTypeInUrl(search, hash)) return false;
  return hasAuthEmailCallbackParams(parseAuthEmailCallbackParams(search, hash));
}

export function classifyAuthEmailCallback(
  params: AuthEmailCallbackParams,
): AuthEmailCallbackKind {
  if (params.error || params.error_description) return "error";
  if (params.access_token && params.refresh_token) return "implicit";
  if (params.code) return "pkce_code";
  if (params.token_hash && params.type) return "token_hash";
  return "none";
}

export function authEmailCallbackErrorMessage(
  params: AuthEmailCallbackParams,
): string {
  const desc = (params.error_description || params.error || "").trim();
  if (/otp|expired|invalid|not found|already|one.?time/i.test(desc)) {
    return (
      "Ссылка недействительна или уже использована. Запросите новое письмо на странице входа " +
      "и откройте ссылку в Safari (не через превью Mail.ru)."
    );
  }
  if (desc) return desc;
  return "Не удалось подтвердить email.";
}

function isRecoveryCallback(params: AuthEmailCallbackParams): boolean {
  return params.type === "recovery";
}

/** Создать сессию из параметров URL (PKCE-клиент не принимает implicit hash сам). */
export async function completeAuthEmailCallback(
  supabase: SupabaseClient,
  params: AuthEmailCallbackParams,
): Promise<{ error: string | null; redirectPath: string }> {
  const kind = classifyAuthEmailCallback(params);
  const redirectPath = isRecoveryCallback(params)
    ? "/auth/reset-password"
    : "/onboarding";

  if (kind === "error") {
    return { error: authEmailCallbackErrorMessage(params), redirectPath: "/auth" };
  }

  if (kind === "none") {
    return {
      error: "В ссылке нет данных для входа. Запросите новое письмо.",
      redirectPath: "/auth",
    };
  }

  if (kind === "implicit") {
    const expiresIn = params.expires_in ? Number(params.expires_in) : undefined;
    const { error } = await supabase.auth.setSession({
      access_token: params.access_token!,
      refresh_token: params.refresh_token!,
      ...(Number.isFinite(expiresIn) ? { expires_in: expiresIn! } : {}),
      ...(params.token_type ? { token_type: params.token_type } : {}),
    });
    if (error) {
      return { error: error.message, redirectPath: "/auth" };
    }
    return { error: null, redirectPath };
  }

  if (kind === "pkce_code") {
    const { error } = await supabase.auth.exchangeCodeForSession(params.code!);
    if (error) {
      const msg = error.message;
      if (/code verifier|bad_code_verifier/i.test(msg)) {
        return {
          error:
            "Ссылка открыта не в том браузере, где вы регистрировались. " +
            "Запросите новое письмо и откройте ссылку в том же браузере (Safari).",
          redirectPath: "/auth",
        };
      }
      return { error: msg, redirectPath: "/auth" };
    }
    return { error: null, redirectPath };
  }

  const otpType = params.type as EmailOtpType;
  const { error } = await supabase.auth.verifyOtp({
    token_hash: params.token_hash!,
    type: otpType,
  });
  if (error) {
    return { error: error.message, redirectPath: "/auth" };
  }
  return { error: null, redirectPath };
}

export function clearAuthCallbackFromUrl(): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.search = "";
  url.hash = "";
  window.history.replaceState(window.history.state, "", url.toString());
}

export function isEmailNotConfirmedError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const row = err as { message?: unknown; code?: unknown };
  const code =
    typeof row.code === "string" ? row.code.toLowerCase() : "";
  if (code === "email_not_confirmed") return true;
  const msg =
    typeof row.message === "string" ? row.message.toLowerCase() : "";
  return /email.*confirm|not confirmed|подтверд/i.test(msg);
}
