"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Mode = "signin" | "signup";

function getAuthErrorMessage(err: unknown) {
  if (!err) return "Ошибка авторизации";

  if (typeof err === "string") return err;

  if (typeof err === "object") {
    const maybeError = err as {
      message?: unknown;
      error_description?: unknown;
      code?: unknown;
      status?: unknown;
    };

    if (typeof maybeError.message === "string" && maybeError.message.trim()) {
      if (
        maybeError.message.toLowerCase().includes("context deadline exceeded")
      ) {
        return "Сервис регистрации не успел отправить письмо подтверждения. Проверьте SMTP-настройки Supabase Auth и попробуйте снова.";
      }
      return maybeError.message;
    }

    if (
      typeof maybeError.error_description === "string" &&
      maybeError.error_description.trim()
    ) {
      return maybeError.error_description;
    }

    const code =
      typeof maybeError.code === "string" ? maybeError.code : undefined;
    const status =
      typeof maybeError.status === "number" ? maybeError.status : undefined;

    if (code || status) {
      return `Ошибка авторизации${code ? ` (${code})` : ""}${status ? ` [HTTP ${status}]` : ""}`;
    }
  }

  return "Ошибка авторизации";
}

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const router = useRouter();

  // если уже залогинен, сразу на главную
  useEffect(() => {
    const check = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        router.replace("/");
      }
    };
    check();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
          },
        });
        if (error) throw error;
        setInfo(
          "На указанный вами email отправлено письмо с подтверждением. Перейдите по ссылке в письме и возвращайтесь.",
        );
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push("/");
      }
    } catch (err: unknown) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <h1 className="mb-6 text-2xl font-semibold text-slate-900">
          {mode === "signup" ? "Регистрация" : "Вход"}
        </h1>

        <div className="mb-6 flex gap-2 rounded-full bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setMode("signin")}
            className={`flex-1 rounded-full px-3 py-2 text-sm font-medium ${
              mode === "signin"
                ? "bg-white text-slate-900 shadow"
                : "text-slate-500"
            }`}
          >
            Вход
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`flex-1 rounded-full px-3 py-2 text-sm font-medium ${
              mode === "signup"
                ? "bg-white text-slate-900 shadow"
                : "text-slate-500"
            }`}
          >
            Регистрация
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Имя и фамилия
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Пароль
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">
              {error}
            </p>
          )}

          {info && (
            <p className="text-sm text-emerald-600">
              {info}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-700 disabled:opacity-60"
          >
            {loading
              ? "Подождите..."
              : mode === "signup"
              ? "Зарегистрироваться"
              : "Войти"}
          </button>
        </form>
      </div>
    </div>
  );
}

