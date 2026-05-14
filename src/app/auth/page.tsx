"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isPasswordRecoverySession } from "@/lib/authRecovery";
import { supabase } from "@/lib/supabaseClient";

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

function getAuthErrorMessage(err: unknown) {
  const redirectHint =
    "Если адрес уже в списке redirect, посмотрите логи: на сервере в каталоге supabase-stack выполните docker compose logs auth --tail 100 (ошибки SMTP GoTrue там виднее). На localhost добавьте в ADDITIONAL_REDIRECT_URLS строку http://localhost:3000/auth/reset-password.";

  if (!err) return "Ошибка авторизации";

  if (typeof err === "string") return err;

  if (typeof err !== "object" || err === null) {
    try {
      return String(err);
    } catch {
      return "Ошибка авторизации";
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
      return "Таймаут шлюза (HTTP 504): Auth слишком долго отвечал при отправке письма — чаще всего контейнер «завис» на подключении к SMTP (порт/firewall TLS). На сервере выполните: cd ~/zeip/supabase-stack && docker compose logs auth --tail 200. Проверьте связь до smtp.timeweb.ru из контейнера (см. команды ниже), попробуйте SMTP_PORT=587 при STARTTLS или 465 для SSL.";
    }

    if (msg) {
      if (msg.toLowerCase().includes("context deadline exceeded")) {
        return "Сервис регистрации не успел отправить письмо. Проверьте SMTP Auth на сервере и попробуйте снова.";
      }
      if (/redirect/i.test(msg) && /invalid|not allowed|mismatch/i.test(msg)) {
        return `${msg} Проверьте ADDITIONAL_REDIRECT_URLS и SITE_URL на сервере Supabase (.env контейнера auth).`;
      }
      const code = formatAuthCode(ae.code);
      const suffix =
        code || st !== undefined
          ? ` (${[code ? `code ${code}` : null, st !== undefined ? `HTTP ${st}` : null].filter(Boolean).join(", ")})`
          : "";
      return `${msg}${suffix}`;
    }

    const code = formatAuthCode(ae.code);
    if (code || st !== undefined) {
      return `Ошибка Auth${code ? `: ${code}` : ""}${st !== undefined ? ` [HTTP ${st}]` : ""}. ${redirectHint}`;
    }

    const fromProps = describeAuthObject(err);
    if (fromProps) return `${fromProps}. ${redirectHint}`;
    return `Не удалось отправить письмо (пустое сообщение от сервера). ${redirectHint}`;
  }

  const keys = Object.keys(err as object);
  if (keys.length === 0) {
    return `Сервис авторизации вернул пустой ответ. ${redirectHint}`;
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
      return "Сервис регистрации не успел отправить письмо подтверждения. Проверьте SMTP-настройки Supabase Auth и попробуйте снова.";
    }
    if (/redirect/i.test(m) && /invalid|not allowed|mismatch/i.test(m)) {
      return `${m} Проверьте ADDITIONAL_REDIRECT_URLS на сервере.`;
    }
    return m;
  }

  if (
    typeof maybeError.error_description === "string" &&
    maybeError.error_description.trim()
  ) {
    return maybeError.error_description.trim();
  }

  const code = formatAuthCode(maybeError.code);
  const status =
    typeof maybeError.status === "number" ? maybeError.status : undefined;

  if (status === 504) {
    return "Таймаут шлюза (HTTP 504): Auth слишком долго отвечал при отправке письма — чаще всего контейнер «завис» на подключении к SMTP. На сервере: docker compose logs auth --tail 200. Проверьте порты smtp.timeweb.ru из контейнера, попробуйте SMTP_PORT=587 вместо 465.";
  }

  if (code || status !== undefined) {
    return `Ошибка авторизации${code ? ` (${code})` : ""}${status !== undefined ? ` [HTTP ${status}]` : ""}. ${redirectHint}`;
  }

  const desc = describeAuthObject(err);
  if (desc) return `${desc}. ${redirectHint}`;
  return `Не удалось выполнить запрос к Auth (${keys.length ? `поля: ${keys.join(", ")}` : "нет полей"}, без текста ошибки). ${redirectHint}`;
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

  // если уже есть сессия: recovery → установка пароля, иначе на главную
  useEffect(() => {
    const check = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) return;
      if (isPasswordRecoverySession(session)) {
        router.replace("/auth/reset-password");
        return;
      }
      router.replace("/");
    };
    void check();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    try {
      if (mode === "forgot") {
        const raw = (
          typeof process !== "undefined"
            ? process.env.NEXT_PUBLIC_EMAIL_AUTH_REDIRECT_ORIGIN?.trim()
            : ""
        ) ?? "";
        const origin =
          typeof window !== "undefined"
            ? raw.length > 0
              ? raw.replace(/\/$/, "")
              : window.location.origin
            : raw.replace(/\/$/, "");
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${origin}/auth/reset-password`,
        });
        if (error) throw error;
        setInfo(
          "Если указанный email зарегистрирован, мы отправили письмо со ссылкой для сброса пароля. Проверьте почту (и папку «Спам»).",
        );
      } else if (mode === "signup") {
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

  const inputClassName =
    "h-12 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#009966] focus:ring-1 focus:ring-[#009966]";

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
                setError(null);
                setInfo(null);
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
                Имя и фамилия
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
              <label className="mb-1 block text-sm font-medium text-slate-800">
                Пароль
              </label>
              <input
                type="password"
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

          {mode === "signin" && (
            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setMode("forgot");
                  setError(null);
                  setInfo(null);
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

