"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  classifyAuthEmailCallback,
  clearAuthCallbackFromUrl,
  consumedOtpUserMessage,
  isConsumedOtpErrorText,
  isRecoveryEmailCallback,
  parseAuthEmailCallbackParams,
} from "@/lib/authEmailCallback";
import {
  isPasswordRecoverySession,
  markPasswordResetComplete,
} from "@/lib/authRecovery";
import { PasswordInput } from "@/components/PasswordInput";
import {
  authGetSession,
  authOnAuthStateChange,
  authRefreshSessionPublic,
  authSignInWithPassword,
  authUpdateUser,
  authVerifyOtp,
  completeAuthEmailCallbackWithParams,
} from "@/services/authService";
import type { Session } from "@supabase/supabase-js";

function getAuthErrorMessage(err: unknown) {
  if (!err) return "Ошибка";
  if (typeof err === "string") return err;
  if (typeof err === "object") {
    const o = err as { message?: unknown; error_description?: unknown };
    const raw =
      (typeof o.message === "string" && o.message.trim()) ||
      (typeof o.error_description === "string" && o.error_description.trim()) ||
      "";
    if (/code verifier|bad_code_verifier/i.test(raw)) {
      return (
        "Ссылка открыта не в том браузере, где запрашивали письмо. " +
        "Запросите новый код на странице входа."
      );
    }
    if (/new password should be different from the old password/i.test(raw)) {
      return "Новый пароль должен отличаться от текущего.";
    }
    if (/password should be at least/i.test(raw)) {
      return "Пароль должен быть не короче 6 символов.";
    }
    if (isConsumedOtpErrorText(raw)) {
      return consumedOtpUserMessage("recovery");
    }
    if (raw) return raw;
  }
  return "Не удалось обновить пароль";
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [canReset, setCanReset] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [legacyLinkError, setLegacyLinkError] = useState<string | null>(null);
  const [otpEmail, setOtpEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);

  useEffect(() => {
    const emailParam = searchParams.get("email");
    if (emailParam) {
      setOtpEmail(emailParam);
    }
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;

    const allowReset = () => {
      if (cancelled) return;
      setCanReset(true);
      setChecking(false);
      setError(null);
      setLegacyLinkError(null);
    };

    const showOtpEntry = (message: string | null) => {
      if (cancelled) return;
      if (message) setLegacyLinkError(message);
      setCanReset(false);
      setChecking(false);
    };

    const applyExistingSession = (session: Session | null) => {
      if (cancelled) return;
      if (isPasswordRecoverySession(session)) {
        allowReset();
        return;
      }
      if (session?.user) {
        router.replace("/map");
        return;
      }
      showOtpEntry(null);
    };

    const { data: sub } = authOnAuthStateChange(async (event, session) => {
      if (cancelled) return;
      if (event === "PASSWORD_RECOVERY") {
        allowReset();
      } else if (
        (event === "SIGNED_IN" || event === "INITIAL_SESSION") &&
        isPasswordRecoverySession(session)
      ) {
        allowReset();
      }
    });

    const run = async () => {
      const params = parseAuthEmailCallbackParams(
        window.location.search,
        window.location.hash,
      );
      const kind = classifyAuthEmailCallback(params);

      if (kind !== "none") {
        const { error: callbackErr } = await completeAuthEmailCallbackWithParams(
          params,
        );
        if (cancelled) return;
        clearAuthCallbackFromUrl();
        if (callbackErr) {
          showOtpEntry(callbackErr);
          return;
        }
        const {
          data: { session },
        } = await authGetSession();
        if (cancelled) return;
        if (
          isPasswordRecoverySession(session) ||
          isRecoveryEmailCallback(params)
        ) {
          allowReset();
          return;
        }
        applyExistingSession(session);
        return;
      }

      const {
        data: { session },
      } = await authGetSession();
      applyExistingSession(session);
    };

    void run();

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [router]);

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!otpEmail.trim()) {
      setError("Укажите email аккаунта.");
      return;
    }
    if (!/^\d{6}$/.test(otpCode.trim())) {
      setError("Код из письма — 6 цифр.");
      return;
    }
    setOtpLoading(true);
    try {
      const { error: otpErr } = await authVerifyOtp({
        email: otpEmail.trim(),
        token: otpCode.trim(),
        type: "recovery",
      });
      if (otpErr) throw otpErr;
      setCanReset(true);
      setError(null);
      setLegacyLinkError(null);
    } catch (err: unknown) {
      setError(getAuthErrorMessage(err));
    } finally {
      setOtpLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (password.length < 6) {
      setError("Пароль должен быть не короче 6 символов");
      return;
    }
    if (password !== passwordConfirm) {
      setError("Пароли не совпадают");
      return;
    }

    setLoading(true);
    try {
      const {
        data: { session: sessionBefore },
      } = await authGetSession();
      const email = sessionBefore?.user?.email ?? null;

      const { error: updErr } = await authUpdateUser({
        password,
      });
      if (updErr) throw updErr;

      await authRefreshSessionPublic();
      const {
        data: { session: sessionAfterRefresh },
      } = await authGetSession();

      if (isPasswordRecoverySession(sessionAfterRefresh) && email) {
        const { error: signInErr } = await authSignInWithPassword({
          email,
          password,
        });
        if (signInErr) throw signInErr;
      }

      markPasswordResetComplete();
      setInfo("Пароль обновлён. Переходим на главную…");
      await new Promise((r) => setTimeout(r, 400));
      router.replace("/map");
    } catch (err: unknown) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const inputClassName =
    "h-12 w-full rounded-xl border border-gray-300 px-3 py-2 text-base text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#009966] focus:ring-1 focus:ring-[#009966]";

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 via-emerald-50/30 to-emerald-50/30 px-3 py-6">
        <p className="text-sm text-slate-600">Загрузка…</p>
      </div>
    );
  }

  if (!canReset) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 via-emerald-50/30 to-emerald-50/30 px-3 py-6">
        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-lg">
          <h1 className="text-xl font-semibold text-slate-900">
            Введите код из письма
          </h1>
          <p className="mt-3 text-sm text-slate-600">
            6-значный код для сброса пароля. Код действует 10 минут. Проверьте
            папку «Спам».
          </p>

          {legacyLinkError ? (
            <p className="mt-3 text-sm text-amber-700">{legacyLinkError}</p>
          ) : null}

          <form onSubmit={handleOtpSubmit} className="mt-6 space-y-3">
            <input
              type="email"
              autoComplete="email"
              placeholder="Email"
              value={otpEmail}
              onChange={(e) => setOtpEmail(e.target.value)}
              className={inputClassName}
            />
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="Код из 6 цифр"
              value={otpCode}
              onChange={(e) =>
                setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              className={inputClassName}
            />
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <button
              type="submit"
              disabled={otpLoading}
              className="flex h-12 w-full items-center justify-center rounded-xl bg-[#009966] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#008855] disabled:opacity-60"
            >
              {otpLoading ? "Проверка…" : "Подтвердить код"}
            </button>
          </form>

          <button
            type="button"
            onClick={() => router.push("/auth")}
            className="mt-4 flex h-12 w-full items-center justify-center rounded-xl border border-[#009966] bg-white px-4 py-2 text-sm font-semibold text-[#009966] shadow-sm transition hover:bg-emerald-50"
          >
            Запросить новый код
          </button>
        </div>
      </div>
    );
  }

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
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Новый пароль
          </h1>
        </div>
        <p className="mb-6 text-sm text-slate-600">
          Придумайте новый пароль для вашего аккаунта.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="reset-password"
              className="mb-1 block text-sm font-medium text-slate-800"
            >
              Новый пароль
            </label>
            <PasswordInput
              id="reset-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              className={inputClassName}
            />
          </div>
          <div>
            <label
              htmlFor="reset-password-confirm"
              className="mb-1 block text-sm font-medium text-slate-800"
            >
              Повтор пароля
            </label>
            <PasswordInput
              id="reset-password-confirm"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              className={inputClassName}
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
          {info && (
            <p className="text-sm text-emerald-600">{info}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex h-12 w-full items-center justify-center rounded-xl bg-[#009966] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#008855] disabled:opacity-60"
          >
            {loading ? "Сохранение…" : "Сохранить пароль"}
          </button>
        </form>
      </div>
    </div>
  );
}
