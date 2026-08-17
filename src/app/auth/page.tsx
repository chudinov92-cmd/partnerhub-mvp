"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  authEmailCallbackPendingInUrl,
  clearAuthCallbackFromUrl,
  completeAuthEmailCallback,
  getEmailAuthCallbackUrl,
  getEmailAuthRedirectOrigin,
  isEmailNotConfirmedError,
  parseAuthEmailCallbackParams,
} from "@/lib/authEmailCallback";
import {
  isPasswordRecoverySession,
  isPasswordResetComplete,
  recoveryCallbackPendingInUrl,
} from "@/lib/authRecovery";
import { resolveAuthedAppEntryPath } from "@/lib/authEntryPath";
import { supabase, supabaseAuthForms } from "@/lib/supabaseClient";
import { linkAnonymousCookieConsent, recordAgreementConsent } from "@/lib/cookieConsent";
import { PasswordInput } from "@/components/PasswordInput";
import {
  AUTH_FORM_TIMEOUT_MS,
  AUTH_OPERATION_TIMEOUT_MS,
  isAuthTimeoutError,
  withAuthTimeout,
} from "@/services/authService";

function authErrMeta(err: unknown): Record<string, unknown> {
  if (!err || typeof err !== "object") return { kind: typeof err };
  const row = err as { code?: unknown; status?: unknown; message?: unknown };
  const msg =
    typeof row.message === "string" ? row.message.slice(0, 200) : undefined;
  return {
    code: formatAuthCode(row.code),
    status: typeof row.status === "number" ? row.status : undefined,
    messageExcerpt: msg,
    isRateLimit:
      formatAuthCode(row.code) === "over_email_send_rate_limit" ||
      row.status === 429 ||
      (typeof msg === "string" &&
        /rate.?limit|only request this after/i.test(msg)),
  };
}

type Mode = "signin" | "signup" | "forgot";

function formatAuthCode(code: unknown): string | undefined {
  if (typeof code === "string") return code;
  if (typeof code === "number") return String(code);
  return undefined;
}

function describeAuthObject(err: object): string {
  const chunks: string[] = [];
  const seen = new Set<string>();
  const names = [
    ...new Set([
      ...Object.keys(err),
      ...Object.getOwnPropertyNames(err),
    ]),
  ];
  for (const key of names) {
    if (key === "__isAuthError" || seen.has(key)) continue;
    seen.add(key);
    try {
      const v = (err as Record<string, unknown>)[key];
      if (v !== undefined && v !== null && `${v}` !== "") {
        chunks.push(
          `${key}=${typeof v === "object" ? JSON.stringify(v) : String(v)}`,
        );
      }
    } catch {
      //
    }
  }
  return chunks.length > 0 ? chunks.join("; ") : "";
}

function isInvalidLoginCredentials(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;

  const row = err as { code?: unknown; message?: unknown };
  const code =
    typeof row.code === "string" ? row.code.toLowerCase() : "";
  if (code === "invalid_credentials" || code === "invalid_grant") {
    return true;
  }

  const msg =
    typeof row.message === "string" ? row.message.toLowerCase() : "";
  return (
    msg.includes("invalid login credentials") ||
    msg.includes("invalid email or password") ||
    msg.includes("wrong password") ||
    msg.includes("incorrect email or password")
  );
}

function isUserAlreadyRegistered(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const row = err as { code?: unknown; message?: unknown };
  const code =
    typeof row.code === "string" ? row.code.toLowerCase() : "";
  if (code === "user_already_exists") return true;
  const msg =
    typeof row.message === "string" ? row.message.toLowerCase() : "";
  return /already registered|user already exists|already been registered/i.test(
    msg,
  );
}

const GENERIC_AUTH_ERROR =
  "Не удалось отправить письмо. Попробуйте ещё раз или напишите в поддержку.";

function sanitizeSupabaseMessage(m: string): string {
  if (
    /неверный|invalid login|wrong password|invalid email or password/i.test(m)
  ) {
    return "Неверный логин или пароль";
  }
  if (/rate.?limit|only request this after/i.test(m)) {
    return "Слишком частые запросы. Подождите минуту.";
  }
  if (/email.*confirm|подтверд/i.test(m)) {
    return "Проверьте почту и перейдите по ссылке подтверждения.";
  }
  return GENERIC_AUTH_ERROR;
}

function authUserMessage(
  err: unknown,
  mode: Mode | undefined,
  message: string,
): string {
  console.error("[auth] getAuthErrorMessage:", { err, mode, message });
  return message;
}

function getAuthErrorMessage(err: unknown, mode?: Mode) {
  if (isAuthTimeoutError(err)) {
    if (mode === "signup") {
      return authUserMessage(
        err,
        mode,
        "Регистрация заняла слишком много времени. Проверьте почту (и «Спам») — письмо могло уйти. Если письма нет, попробуйте снова через минуту.",
      );
    }
    if (mode === "forgot") {
      return authUserMessage(
        err,
        mode,
        "Запрос на сброс пароля занял слишком много времени. Проверьте почту или попробуйте снова через минуту.",
      );
    }
    return authUserMessage(
      err,
      mode,
      "Сервис авторизации не отвечает. Проверьте интернет и попробуйте ещё раз через минуту.",
    );
  }

  const meta = authErrMeta(err);
  if (meta.isRateLimit) {
    const excerpt =
      typeof meta.messageExcerpt === "string" ? meta.messageExcerpt : "";
    const sec = excerpt.match(/after\s+(\d+)\s+seconds?/i)?.[1];
    return authUserMessage(
      err,
      mode,
      sec
        ? `Слишком частые запросы письма. Подождите ${sec} сек. и попробуйте снова.`
        : "Слишком частые запросы письма. Подождите минуту и попробуйте снова.",
    );
  }

  if (isInvalidLoginCredentials(err)) {
    return authUserMessage(err, mode, "Неверный логин или пароль");
  }

  if (isUserAlreadyRegistered(err)) {
    return authUserMessage(
      err,
      mode,
      mode === "signup"
        ? "Этот email уже зарегистрирован. Проверьте почту (и «Спам») — письмо с подтверждением могло уже уйти. Или нажмите «Отправить письмо ещё раз» ниже."
        : "Этот email уже зарегистрирован. Перейдите на вкладку «Вход».",
    );
  }

  if (!err) return authUserMessage(err, mode, "Ошибка авторизации");

  if (typeof err === "string") {
    return authUserMessage(err, mode, sanitizeSupabaseMessage(err));
  }

  if (typeof err !== "object" || err === null) {
    try {
      return authUserMessage(err, mode, sanitizeSupabaseMessage(String(err)));
    } catch {
      return authUserMessage(err, mode, "Ошибка авторизации");
    }
  }

  if (err instanceof Error) {
    const ae = err as Error & {
      status?: unknown;
      code?: unknown;
    };
    const st =
      typeof ae.status === "number" ? ae.status : undefined;

    const msgRaw = typeof ae.message === "string" ? ae.message.trim() : "";
    const msg =
      msgRaw === "{}" || msgRaw === "" ? "" : msgRaw;

    if (st === 504) {
      return authUserMessage(
        err,
        mode,
        "Сервис временно недоступен. Попробуйте через 1–2 минуты.",
      );
    }

    if (msg) {
      if (msg.toLowerCase().includes("context deadline exceeded")) {
        return authUserMessage(
          err,
          mode,
          "Письмо не успело уйти. Проверьте папку «Спам» или попробуйте снова.",
        );
      }
      if (/redirect/i.test(msg) && /invalid|not allowed|mismatch/i.test(msg)) {
        return authUserMessage(
          err,
          mode,
          "Ошибка конфигурации сервиса. Напишите в поддержку — мы разберёмся.",
        );
      }
      return authUserMessage(err, mode, sanitizeSupabaseMessage(msg));
    }

    const code = formatAuthCode(ae.code);
    if (code || st !== undefined) {
      return authUserMessage(err, mode, GENERIC_AUTH_ERROR);
    }

    const fromProps = describeAuthObject(err);
    if (fromProps) return authUserMessage(err, mode, GENERIC_AUTH_ERROR);
    return authUserMessage(err, mode, GENERIC_AUTH_ERROR);
  }

  const keys = Object.keys(err as object);
  if (keys.length === 0) {
    return authUserMessage(
      err,
      mode,
      "Сервис авторизации не ответил. Попробуйте ещё раз.",
    );
  }

  const maybeError = err as {
    message?: unknown;
    error_description?: unknown;
    code?: unknown;
    status?: unknown;
  };

  if (typeof maybeError.message === "string" && maybeError.message.trim()) {
    const m = maybeError.message.trim();
    if (m.toLowerCase().includes("context deadline exceeded")) {
      return authUserMessage(
        err,
        mode,
        "Письмо не успело уйти. Проверьте папку «Спам» или попробуйте снова.",
      );
    }
    if (/redirect/i.test(m) && /invalid|not allowed|mismatch/i.test(m)) {
      return authUserMessage(
        err,
        mode,
        "Ошибка конфигурации сервиса. Напишите в поддержку — мы разберёмся.",
      );
    }
    return authUserMessage(err, mode, sanitizeSupabaseMessage(m));
  }

  if (
    typeof maybeError.error_description === "string" &&
    maybeError.error_description.trim()
  ) {
    return authUserMessage(
      err,
      mode,
      sanitizeSupabaseMessage(maybeError.error_description.trim()),
    );
  }

  const code = formatAuthCode(maybeError.code);
  const status =
    typeof maybeError.status === "number" ? maybeError.status : undefined;

  if (status === 504) {
    return authUserMessage(
      err,
      mode,
      "Сервис временно недоступен. Попробуйте через 1–2 минуты.",
    );
  }

  if (code || status !== undefined) {
    return authUserMessage(err, mode, GENERIC_AUTH_ERROR);
  }

  const desc = describeAuthObject(err);
  if (desc) return authUserMessage(err, mode, GENERIC_AUTH_ERROR);
  return authUserMessage(err, mode, "Ошибка авторизации. Попробуйте ещё раз.");
}

/** Безопасный путь после входа (?redirect=/admin/support). */
function getAuthRedirectParam(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("redirect");
}

async function redirectAuthedUser(
  authUserId: string,
  router: ReturnType<typeof useRouter>,
): Promise<void> {
  const target = await resolveAuthedAppEntryPath(
    authUserId,
    getAuthRedirectParam(),
  );
  if (target.startsWith("/admin")) {
    window.location.replace(target);
    return;
  }
  router.replace(target);
}

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [consentChecked, setConsentChecked] = useState(false);
  const [agreementChecked, setAgreementChecked] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [showResendConfirmation, setShowResendConfirmation] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const urlMode = params.get("mode");
    if (urlMode === "signup") {
      setMode("signup");
    }
    const urlError = params.get("error");
    if (urlError) {
      setError(urlError);
      const url = new URL(window.location.href);
      url.searchParams.delete("error");
      window.history.replaceState(window.history.state, "", url.toString());
    }
  }, []);

  // Старые письма с redirect_to=/auth: implicit hash / ?code= — поднимаем сессию здесь
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!authEmailCallbackPendingInUrl(window.location.search, window.location.hash)) {
      return;
    }

    let cancelled = false;

    const run = async () => {
      const params = parseAuthEmailCallbackParams(
        window.location.search,
        window.location.hash,
      );
      const { error: callbackErr, redirectPath } =
        await completeAuthEmailCallback(supabase, params);
      if (cancelled) return;
      if (callbackErr) {
        setError(callbackErr);
        clearAuthCallbackFromUrl();
        return;
      }
      clearAuthCallbackFromUrl();
      linkAnonymousCookieConsent();
      window.location.replace(redirectPath);
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  // если уже есть сессия: recovery → установка пароля, иначе на онбординг / redirect
  useEffect(() => {
    const check = async () => {
      if (recoveryCallbackPendingInUrl()) {
        window.location.replace(
          `/auth/reset-password${window.location.search}${window.location.hash}`,
        );
        return;
      }
      if (
        authEmailCallbackPendingInUrl(window.location.search, window.location.hash)
      ) {
        return;
      }
      const {
        data: { session },
      } = await withAuthTimeout(
        supabase.auth.getSession(),
        "getSession",
        AUTH_OPERATION_TIMEOUT_MS,
      );
      if (!session?.user) return;
      if (isPasswordRecoverySession(session) && !isPasswordResetComplete()) {
        router.replace("/auth/reset-password");
        return;
      }
      await redirectAuthedUser(session.user.id, router);
    };
    void check();
  }, [router]);

  const handleResendConfirmation = async () => {
    if (!email.trim()) {
      setError("Укажите email для повторной отправки письма.");
      return;
    }
    setResendLoading(true);
    setError(null);
    setInfo(null);
    try {
      const { error: resendErr } = await withAuthTimeout(
        supabaseAuthForms.auth.resend({
          type: "signup",
          email: email.trim(),
          options: {
            emailRedirectTo: getEmailAuthCallbackUrl(),
          },
        }),
        "resendSignupConfirmation",
        AUTH_FORM_TIMEOUT_MS,
      );
      if (resendErr) throw resendErr;
      setInfo(
        "Письмо с подтверждением отправлено повторно. Откройте ссылку в том же браузере (Safari), где регистрировались.",
      );
      setShowResendConfirmation(false);
    } catch (err: unknown) {
      setError(getAuthErrorMessage(err, "signup"));
    } finally {
      setResendLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setShowResendConfirmation(false);

    if (mode === "signup" && password !== passwordConfirm) {
      setError("Пароли не совпадают");
      return;
    }

    setLoading(true);

    try {
      if (mode === "forgot") {
        const origin = getEmailAuthRedirectOrigin();
        const redirectTo = `${origin}/auth/reset-password`;
        const { error } = await withAuthTimeout(
          supabaseAuthForms.auth.resetPasswordForEmail(email, {
            redirectTo,
          }),
          "resetPasswordForEmail",
          AUTH_FORM_TIMEOUT_MS,
        );
        if (error) throw error;
        setInfo(
          "Если указанный email зарегистрирован, мы отправили письмо со ссылкой для сброса пароля. Откройте ссылку в том же браузере (Safari), где запрашивали сброс — не через превью в Telegram. Проверьте почту (и папку «Спам»).",
        );
      } else if (mode === "signup") {
        const { error } = await withAuthTimeout(
          supabaseAuthForms.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: getEmailAuthCallbackUrl(),
              data: {
                full_name: fullName,
              },
            },
          }),
          "signUp",
          AUTH_FORM_TIMEOUT_MS,
        );
        if (error) throw error;
        recordAgreementConsent();
        linkAnonymousCookieConsent();
        setInfo(
          "На указанный вами email отправлено письмо с подтверждением. Перейдите по ссылке в письме и возвращайтесь.",
        );
      } else {
        let redirected = false;

        const finishSignIn = async (userId: string) => {
          if (redirected) return;
          redirected = true;
          linkAnonymousCookieConsent();
          const target = await resolveAuthedAppEntryPath(
            userId,
            getAuthRedirectParam(),
          );
          window.location.replace(target);
        };

        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange((event, session) => {
          if (event === "SIGNED_IN" && session?.user) {
            void finishSignIn(session.user.id);
          }
        });

        try {
          const { error } = await withAuthTimeout(
            supabase.auth.signInWithPassword({
              email,
              password,
            }),
            "signInWithPassword",
            AUTH_FORM_TIMEOUT_MS,
          );
          if (error) throw error;
          const {
            data: { session },
          } = await withAuthTimeout(
            supabase.auth.getSession(),
            "getSession(post-login)",
            AUTH_OPERATION_TIMEOUT_MS,
          );
          if (session?.user) {
            await finishSignIn(session.user.id);
          }
        } catch (err: unknown) {
          if (
            !redirected &&
            isAuthTimeoutError(err)
          ) {
            try {
              const {
                data: { session },
              } = await withAuthTimeout(
                supabase.auth.getSession(),
                "getSession(post-login)",
                AUTH_OPERATION_TIMEOUT_MS,
              );
              if (session?.user) {
                await finishSignIn(session.user.id);
                return;
              }
            } catch {
              // ignore — покажем ошибку ниже
            }
          }
          if (!redirected) {
            setError(getAuthErrorMessage(err, "signin"));
            setShowResendConfirmation(isEmailNotConfirmedError(err));
          }
        } finally {
          subscription.unsubscribe();
          if (!redirected) {
            setLoading(false);
          }
        }
        return;
      }
    } catch (err: unknown) {
      setError(getAuthErrorMessage(err, mode));
      if (mode === "signup" && isUserAlreadyRegistered(err)) {
        setShowResendConfirmation(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const inputClassName =
    "h-12 w-full rounded-xl border border-gray-300 px-3 py-2 text-base text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#009966] focus:ring-1 focus:ring-[#009966]";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 via-emerald-50/30 to-emerald-50/30 px-3 py-6">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-lg">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-xl bg-gradient-to-br from-[#009966] to-emerald-600 p-2">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5 text-white"
              aria-hidden
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">
            {mode === "signup"
              ? "Регистрация"
              : mode === "forgot"
                ? "Восстановление пароля"
                : "Вход"}
          </h1>
        </div>

        {mode !== "forgot" ? (
          <div className="mb-6 flex gap-2 rounded-full bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => {
                setMode("signin");
                setConsentChecked(false);
                setAgreementChecked(false);
                setSubmitAttempted(false);
                setPasswordConfirm("");
                setError(null);
                setInfo(null);
                setShowResendConfirmation(false);
              }}
              className={`flex-1 rounded-full px-3 py-2 text-sm font-medium transition ${
                mode === "signin"
                  ? "bg-[#009966] text-white shadow"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Вход
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("signup");
                setConsentChecked(false);
                setAgreementChecked(false);
                setSubmitAttempted(false);
                setPasswordConfirm("");
                setError(null);
                setInfo(null);
              }}
              className={`flex-1 rounded-full px-3 py-2 text-sm font-medium transition ${
                mode === "signup"
                  ? "bg-[#009966] text-white shadow"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Регистрация
            </button>
          </div>
        ) : (
          <p className="mb-6 text-sm text-slate-600">
            Укажите email аккаунта — мы отправим ссылку для установки нового
            пароля.
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-800">
                Имя
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className={inputClassName}
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-800">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={inputClassName}
            />
          </div>

          {mode !== "forgot" && (
            <div>
              <label
                htmlFor="auth-password"
                className="mb-1 block text-sm font-medium text-slate-800"
              >
                Пароль
              </label>
              <PasswordInput
                id="auth-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={
                  mode === "signup" ? "new-password" : "current-password"
                }
                className={inputClassName}
              />
            </div>
          )}

          {mode === "signup" && (
            <div>
              <label
                htmlFor="auth-password-confirm"
                className="mb-1 block text-sm font-medium text-slate-800"
              >
                Введите пароль повторно
              </label>
              <PasswordInput
                id="auth-password-confirm"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                className={inputClassName}
              />
            </div>
          )}

          <div role="alert" aria-live="assertive" aria-atomic="true">
            {error ? (
              <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                <span aria-hidden="true" className="mt-0.5 shrink-0">
                  ⚠
                </span>
                <span>{error}</span>
              </div>
            ) : null}
          </div>

          <div aria-live="polite" aria-atomic="true">
            {info ? (
              <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                <span aria-hidden="true" className="mt-0.5 shrink-0">
                  ✓
                </span>
                <span>{info}</span>
              </div>
            ) : null}
          </div>

          {mode === "signup" && (
            <div className="space-y-3">
              <label className="flex cursor-pointer items-start gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  required
                  checked={consentChecked}
                  onChange={(e) => setConsentChecked(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[#009966]"
                />
                <span>
                  Я даю согласие на обработку персональных данных в соответствии с{" "}
                  <a
                    href="/personal-data"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-[#009966] underline underline-offset-2 hover:text-[#008855]"
                  >
                    Согласием на обработку ПД
                  </a>
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  required
                  checked={agreementChecked}
                  onChange={(e) => setAgreementChecked(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[#009966]"
                />
                <span>
                  Я принимаю условия{" "}
                  <a
                    href="/terms/agreement"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-[#009966] underline underline-offset-2 hover:text-[#008855]"
                  >
                    Пользовательского соглашения
                  </a>
                </span>
              </label>
            </div>
          )}

          <button
            type="submit"
            disabled={
              loading ||
              (mode === "signup" && (!consentChecked || !agreementChecked))
            }
            onClick={() => {
              if (
                mode === "signup" &&
                (!consentChecked || !agreementChecked)
              ) {
                setSubmitAttempted(true);
              }
            }}
            className="flex h-12 w-full items-center justify-center rounded-xl bg-[#009966] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#008855] disabled:opacity-60"
          >
            {loading
              ? "Подождите..."
              : mode === "forgot"
                ? "Отправить ссылку"
                : mode === "signup"
                  ? "Зарегистрироваться"
                  : "Войти"}
          </button>

          {mode === "signup" &&
          submitAttempted &&
          !loading &&
          (!consentChecked || !agreementChecked) ? (
            <p className="text-center text-xs text-slate-500" role="alert">
              Отметьте оба согласия выше, чтобы продолжить
            </p>
          ) : null}

          {(mode === "signin" || mode === "signup") && showResendConfirmation && (
            <div className="text-center">
              <button
                type="button"
                disabled={resendLoading}
                onClick={() => void handleResendConfirmation()}
                className="text-sm font-medium text-[#009966] hover:text-[#008855] hover:underline disabled:opacity-60"
              >
                {resendLoading
                  ? "Отправляем…"
                  : "Отправить письмо подтверждения ещё раз"}
              </button>
            </div>
          )}

          {mode === "signin" && (
            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setMode("forgot");
                  setConsentChecked(false);
                  setAgreementChecked(false);
                  setSubmitAttempted(false);
                  setPasswordConfirm("");
                  setError(null);
                  setInfo(null);
                  setShowResendConfirmation(false);
                }}
                className="text-sm font-medium text-[#009966] hover:text-[#008855] hover:underline"
              >
                Забыли пароль?
              </button>
            </div>
          )}

          {mode === "forgot" && (
            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setMode("signin");
                  setConsentChecked(false);
                  setAgreementChecked(false);
                  setSubmitAttempted(false);
                  setPasswordConfirm("");
                  setError(null);
                  setInfo(null);
                }}
                className="text-sm font-medium text-slate-600 hover:text-slate-800 hover:underline"
              >
                Вернуться ко входу
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

