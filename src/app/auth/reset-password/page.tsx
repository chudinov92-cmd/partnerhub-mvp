"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  isPasswordRecoverySession,
  recoveryCallbackPendingInUrl,
} from "@/lib/authRecovery";
import { supabase } from "@/lib/supabaseClient";
import type { Session } from "@supabase/supabase-js";

function getAuthErrorMessage(err: unknown) {
  if (!err) return "Ошибка";
  if (typeof err === "string") return err;
  if (typeof err === "object") {
    const o = err as { message?: unknown; error_description?: unknown };
    if (typeof o.message === "string" && o.message.trim()) return o.message;
    if (
      typeof o.error_description === "string" &&
      o.error_description.trim()
    ) {
      return o.error_description;
    }
  }
  return "Не удалось обновить пароль";
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [canReset, setCanReset] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const applySession = (session: Session | null) => {
      if (cancelled) return;
      if (isPasswordRecoverySession(session)) {
        setCanReset(true);
        setChecking(false);
      }
    };

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === "PASSWORD_RECOVERY") {
        setCanReset(true);
        setChecking(false);
        return;
      }
      if (event === "INITIAL_SESSION") {
        applySession(session);
        if (
          !recoveryCallbackPendingInUrl() ||
          isPasswordRecoverySession(session)
        ) {
          setChecking(false);
        }
        return;
      }
      if (event === "SIGNED_IN") {
        applySession(session);
      }
    });

    const t = window.setTimeout(() => {
      if (cancelled) return;
      void supabase.auth.getSession().then(({ data: { session } }) => {
        if (cancelled) return;
        if (isPasswordRecoverySession(session)) setCanReset(true);
        setChecking(false);
      });
    }, 2800);

    return () => {
      cancelled = true;
      window.clearTimeout(t);
      sub.subscription.unsubscribe();
    };
  }, []);

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
      const { error: updErr } = await supabase.auth.updateUser({
        password,
      });
      if (updErr) throw updErr;
      setInfo("Пароль обновлён. Переходим на главную…");
      await new Promise((r) => setTimeout(r, 400));
      router.replace("/");
    } catch (err: unknown) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const inputClassName =
    "h-12 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#009966] focus:ring-1 focus:ring-[#009966]";

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 via-emerald-50/30 to-emerald-50/30 px-3 py-6">
        <p className="text-sm text-slate-600">Проверка ссылки…</p>
      </div>
    );
  }

  if (!canReset) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 via-emerald-50/30 to-emerald-50/30 px-3 py-6">
        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-lg">
          <h1 className="text-xl font-semibold text-slate-900">
            Ссылка недействительна или устарела
          </h1>
          <p className="mt-3 text-sm text-slate-600">
            Запросите новую ссылку на странице входа («Забыли пароль?»).
          </p>
          <button
            type="button"
            onClick={() => router.push("/auth")}
            className="mt-6 flex h-12 w-full items-center justify-center rounded-xl bg-[#009966] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#008855]"
          >
            На страницу входа
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
            <label className="mb-1 block text-sm font-medium text-slate-800">
              Новый пароль
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              className={inputClassName}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-800">
              Повтор пароля
            </label>
            <input
              type="password"
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
