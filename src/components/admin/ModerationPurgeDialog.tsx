"use client";

import { useEffect, useState } from "react";
import { MODERATION_PURGE_REASONS } from "@/app/api/admin/users/_lib/moderationPurgeEmail";

export type ModerationPreview = {
  found: boolean;
  profile_id?: string | null;
  auth_user_id?: string | null;
  full_name?: string | null;
  city?: string | null;
  role_title?: string | null;
  email?: string | null;
  is_admin?: boolean;
  is_blocked?: boolean | null;
  deleted_at?: string | null;
  error?: string;
};

type ModerationPurgeDialogProps = {
  open: boolean;
  initialQuery?: string;
  onClose: () => void;
  onSuccess?: () => void;
};

const CONFIRM_TEXT = "УДАЛИТЬ";

export function ModerationPurgeDialog({
  open,
  initialQuery = "",
  onClose,
  onSuccess,
}: ModerationPurgeDialogProps) {
  const [query, setQuery] = useState(initialQuery);
  const [preview, setPreview] = useState<ModerationPreview | null>(null);
  const [reason, setReason] = useState<string>("spam");
  const [reasonNote, setReasonNote] = useState("");
  const [confirm, setConfirm] = useState("");
  const [sendEmail, setSendEmail] = useState(true);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [purgeLoading, setPurgeLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setQuery(initialQuery);
      setPreview(null);
      setConfirm("");
      setReasonNote("");
      setReason("spam");
      setSendEmail(true);
      setError(null);
      setSuccess(null);
    }
  }, [open, initialQuery]);

  if (!open) return null;

  const lookup = async () => {
    const q = query.trim();
    if (!q) return;
    setLookupLoading(true);
    setError(null);
    setSuccess(null);
    setPreview(null);
    try {
      const res = await fetch(
        `/api/admin/users/lookup?query=${encodeURIComponent(q)}`,
        { credentials: "include" },
      );
      const j = (await res.json().catch(() => ({}))) as ModerationPreview & {
        error?: string;
      };
      if (!res.ok) {
        throw new Error(j.error ?? "Не удалось найти аккаунт");
      }
      setPreview(j);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка поиска");
    } finally {
      setLookupLoading(false);
    }
  };

  const purge = async () => {
    if (!preview?.found) return;
    setPurgeLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/admin/users/purge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          query: query.trim(),
          confirm,
          reason,
          reason_note: reasonNote.trim() || undefined,
          send_email: sendEmail,
        }),
      });
      const j = (await res.json().catch(() => ({}))) as {
        error?: string;
        email_sent?: boolean;
        email_skipped?: boolean;
      };
      if (!res.ok) {
        throw new Error(j.error ?? "Не удалось удалить аккаунт");
      }
      const mailNote = j.email_sent
        ? " Письмо отправлено."
        : j.email_skipped
          ? " Письмо не отправлялось."
          : "";
      setSuccess(`Аккаунт удалён.${mailNote}`);
      onSuccess?.();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка удаления");
    } finally {
      setPurgeLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-end justify-center bg-slate-900/50 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="moderation-purge-title"
    >
      <div className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2
              id="moderation-purge-title"
              className="text-lg font-semibold text-slate-900"
            >
              Удаление нарушителя
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Полное удаление профиля и входа. Действие необратимо.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm font-semibold text-slate-500 hover:bg-slate-100"
          >
            Закрыть
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Ссылка, код, UUID или email
            </label>
            <div className="flex gap-2">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value.slice(0, 500))}
                placeholder="https://zeip.ru/p/Ab3xK9mn или email…"
                className="h-10 min-w-0 flex-1 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-500/20"
              />
              <button
                type="button"
                onClick={() => void lookup()}
                disabled={lookupLoading || !query.trim()}
                className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 px-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {lookupLoading ? "…" : "Найти"}
              </button>
            </div>
          </div>

          {preview?.found ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
              <p className="font-semibold text-slate-900">
                {preview.full_name || "Без имени"}
              </p>
              <p className="text-slate-600">
                {[preview.role_title, preview.city].filter(Boolean).join(" · ") ||
                  "—"}
              </p>
              <p className="mt-2 break-all text-xs text-slate-500">
                profile: {preview.profile_id ?? "—"}
              </p>
              <p className="break-all text-xs text-slate-500">
                auth: {preview.auth_user_id ?? "—"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                email: {preview.email ?? "нет"}
              </p>
              {preview.is_admin ? (
                <p className="mt-2 text-xs font-semibold text-rose-700">
                  Это аккаунт администратора — удаление запрещено.
                </p>
              ) : null}
            </div>
          ) : null}

          {preview?.found && !preview.is_admin ? (
            <>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Причина
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-500/20"
                >
                  {MODERATION_PURGE_REASONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Комментарий (необязательно)
                </label>
                <input
                  value={reasonNote}
                  onChange={(e) => setReasonNote(e.target.value.slice(0, 300))}
                  placeholder="Кратко для аудита…"
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={sendEmail}
                  onChange={(e) => setSendEmail(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                Отправить письмо о нарушении правил
              </label>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Подтверждение: введите {CONFIRM_TEXT}
                </label>
                <input
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="h-10 w-full rounded-xl border border-rose-200 px-3 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              <button
                type="button"
                onClick={() => void purge()}
                disabled={purgeLoading || confirm !== CONFIRM_TEXT}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-rose-600 px-4 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
              >
                {purgeLoading ? "Удаляем…" : "Полностью удалить аккаунт"}
              </button>
            </>
          ) : null}

          {error ? (
            <p className="text-sm font-medium text-rose-700">{error}</p>
          ) : null}
          {success ? (
            <p className="text-sm font-medium text-emerald-700">{success}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
