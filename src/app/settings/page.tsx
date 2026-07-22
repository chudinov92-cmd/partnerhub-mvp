"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { PushNotificationsSettings } from "@/components/PushNotificationsSettings";
import { supabase } from "@/lib/supabaseClient";
import { authGetUser, authSignOut } from "@/services/authService";
import {
  fetchCurrentUserProfileRow,
  setProfileMapVisible,
} from "@/services/profileService";
import {
  getSubscriptionStatus,
  isActiveProProfile,
} from "@/services/subscriptionService";

function getEmailRedirectOrigin(): string {
  const raw =
    (typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_EMAIL_AUTH_REDIRECT_ORIGIN?.trim()
      : "") ?? "";
  if (typeof window !== "undefined") {
    return raw.length > 0 ? raw.replace(/\/$/, "") : window.location.origin;
  }
  return raw.replace(/\/$/, "");
}

function formatExpiresAt(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [mapVisible, setMapVisible] = useState(true);
  const [mapBusy, setMapBusy] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [proExpiresAt, setProExpiresAt] = useState<string | null>(null);

  const [newEmail, setNewEmail] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailMsg, setEmailMsg] = useState<string | null>(null);
  const [emailErr, setEmailErr] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);
  const [passwordErr, setPasswordErr] = useState<string | null>(null);

  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteErr, setDeleteErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error, sessionExpired } = await authGetUser();
      if (sessionExpired || error || !data.user) {
        router.replace("/auth?redirect=/settings");
        return;
      }
      setEmail(data.user.email ?? null);

      const profile = await fetchCurrentUserProfileRow(data.user.id);
      if (!profile) {
        router.replace("/auth?redirect=/settings");
        return;
      }
      setProfileId(profile.id);
      setMapVisible(profile.map_visible !== false);

      const status = await getSubscriptionStatus(profile.id);
      setIsPro(status.isPro);
      setProExpiresAt(status.expiresAt);
    } catch (err) {
      console.error("[settings] load", err);
      router.replace("/auth?redirect=/settings");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  const onToggleMapVisible = async (next: boolean) => {
    if (!profileId || mapBusy) return;
    setMapBusy(true);
    try {
      await setProfileMapVisible(profileId, next);
      setMapVisible(next);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Не удалось сохранить");
    } finally {
      setMapBusy(false);
    }
  };

  const onChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailErr(null);
    setEmailMsg(null);
    const trimmed = newEmail.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@")) {
      setEmailErr("Укажите корректный email");
      return;
    }
    if (email && trimmed === email.toLowerCase()) {
      setEmailErr("Это уже ваш текущий email");
      return;
    }
    setEmailBusy(true);
    try {
      const origin = getEmailRedirectOrigin();
      const { error } = await supabase.auth.updateUser(
        { email: trimmed },
        { emailRedirectTo: `${origin}/settings` },
      );
      if (error) throw error;
      setEmailMsg(
        "На новый адрес отправлено письмо с подтверждением. После перехода по ссылке email обновится.",
      );
      setNewEmail("");
    } catch (err) {
      setEmailErr(err instanceof Error ? err.message : "Не удалось сменить email");
    } finally {
      setEmailBusy(false);
    }
  };

  const onChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordErr(null);
    setPasswordMsg(null);
    if (!email) {
      setPasswordErr("Email сессии не найден");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordErr("Новый пароль должен быть не короче 6 символов");
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      setPasswordErr("Пароли не совпадают");
      return;
    }
    setPasswordBusy(true);
    try {
      const { error: signErr } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });
      if (signErr) {
        setPasswordErr("Текущий пароль неверный");
        return;
      }
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setPasswordMsg("Пароль обновлён");
      setCurrentPassword("");
      setNewPassword("");
      setNewPasswordConfirm("");
    } catch (err) {
      setPasswordErr(
        err instanceof Error ? err.message : "Не удалось сменить пароль",
      );
    } finally {
      setPasswordBusy(false);
    }
  };

  const onDeleteAccount = async () => {
    setDeleteErr(null);
    if (deleteConfirm.trim() !== "УДАЛИТЬ") {
      setDeleteErr('Введите слово УДАЛИТЬ заглавными буквами для подтверждения');
      return;
    }
    if (
      !window.confirm(
        "Удалить аккаунт безвозвратно? Профиль скроется с карты, вход станет недоступен. Сообщения в чатах останутся как «Удалённый пользователь».",
      )
    ) {
      return;
    }
    setDeleteBusy(true);
    try {
      const res = await fetch("/api/v1/account/delete", {
        method: "POST",
        credentials: "include",
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(body.error ?? "Не удалось удалить аккаунт");
      }
      await authSignOut();
      router.replace("/auth");
    } catch (err) {
      setDeleteErr(err instanceof Error ? err.message : "Ошибка удаления");
    } finally {
      setDeleteBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">Загрузка настроек...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            Настройки
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Уведомления, доступ к аккаунту и видимость на карте
          </p>
        </div>

        <PushNotificationsSettings />

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">
            Видимость на карте
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Если выключить, ваш пин и профиль не будут видны другим на карте и в
            ленте карты. Чаты и контакты сохранятся.
          </p>
          <label className="mt-4 flex cursor-pointer items-center justify-between gap-3">
            <span className="text-sm font-medium text-slate-800">
              Показывать меня на карте
            </span>
            <input
              type="checkbox"
              className="h-5 w-5 accent-[#009966]"
              checked={mapVisible}
              disabled={mapBusy || !profileId}
              onChange={(e) => void onToggleMapVisible(e.target.checked)}
            />
          </label>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Изменить email</h2>
          <p className="mt-2 text-sm text-slate-600">
            Текущий:{" "}
            <span className="font-medium text-slate-900">{email ?? "—"}</span>
          </p>
          <form onSubmit={onChangeEmail} className="mt-4 space-y-3">
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="Новый email"
              autoComplete="email"
              className="h-12 w-full rounded-xl border border-gray-300 px-3 text-base text-slate-900 outline-none focus:border-[#009966] focus:ring-1 focus:ring-[#009966]"
            />
            {emailErr ? (
              <p className="text-sm text-red-600">{emailErr}</p>
            ) : null}
            {emailMsg ? (
              <p className="text-sm text-emerald-700">{emailMsg}</p>
            ) : null}
            <button
              type="submit"
              disabled={emailBusy}
              className="rounded-lg bg-[#009966] px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {emailBusy ? "…" : "Отправить подтверждение"}
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Изменить пароль</h2>
          <form onSubmit={onChangePassword} className="mt-4 space-y-3">
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Текущий пароль"
              autoComplete="current-password"
              className="h-12 w-full rounded-xl border border-gray-300 px-3 text-base text-slate-900 outline-none focus:border-[#009966] focus:ring-1 focus:ring-[#009966]"
            />
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Новый пароль"
              autoComplete="new-password"
              className="h-12 w-full rounded-xl border border-gray-300 px-3 text-base text-slate-900 outline-none focus:border-[#009966] focus:ring-1 focus:ring-[#009966]"
            />
            <input
              type="password"
              value={newPasswordConfirm}
              onChange={(e) => setNewPasswordConfirm(e.target.value)}
              placeholder="Повторите новый пароль"
              autoComplete="new-password"
              className="h-12 w-full rounded-xl border border-gray-300 px-3 text-base text-slate-900 outline-none focus:border-[#009966] focus:ring-1 focus:ring-[#009966]"
            />
            {passwordErr ? (
              <p className="text-sm text-red-600">{passwordErr}</p>
            ) : null}
            {passwordMsg ? (
              <p className="text-sm text-emerald-700">{passwordMsg}</p>
            ) : null}
            <button
              type="submit"
              disabled={passwordBusy}
              className="rounded-lg bg-[#009966] px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {passwordBusy ? "…" : "Сохранить пароль"}
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Подписка Pro</h2>
          {isPro || isActiveProProfile({ is_pro: isPro, pro_expires_at: proExpiresAt }) ? (
            <p className="mt-2 text-sm text-emerald-800">
              Pro активна
              {proExpiresAt ? ` до ${formatExpiresAt(proExpiresAt)}` : ""}
            </p>
          ) : (
            <p className="mt-2 text-sm text-slate-600">Сейчас активен бесплатный тариф</p>
          )}
          <Link
            href="/subscription"
            className="mt-4 inline-flex rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-900 hover:bg-emerald-100"
          >
            Управление подпиской
          </Link>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Документы</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link href="/terms/privacy" className="text-[#009966] hover:underline">
                Политика конфиденциальности
              </Link>
            </li>
            <li>
              <Link href="/terms/consent" className="text-[#009966] hover:underline">
                Согласие на обработку ПД
              </Link>
            </li>
            <li>
              <Link href="/terms/oferta" className="text-[#009966] hover:underline">
                Оферта
              </Link>
            </li>
            <li>
              <Link href="/personal-data" className="text-[#009966] hover:underline">
                Персональные данные и cookie
              </Link>
            </li>
          </ul>
        </section>

        <section className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-red-700">Удалить аккаунт</h2>
          <label className="mt-4 block text-sm font-medium text-slate-800">
            Введите УДАЛИТЬ для подтверждения
          </label>
          <input
            type="text"
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            className="mt-1 h-12 w-full rounded-xl border border-red-200 px-3 text-base text-slate-900 outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400"
            autoComplete="off"
          />
          {deleteErr ? (
            <p className="mt-2 text-sm text-red-600">{deleteErr}</p>
          ) : null}
          <button
            type="button"
            disabled={deleteBusy}
            onClick={() => void onDeleteAccount()}
            className="mt-4 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          >
            {deleteBusy ? "Удаляем…" : "Удалить аккаунт"}
          </button>
        </section>
      </div>
    </div>
  );
}
