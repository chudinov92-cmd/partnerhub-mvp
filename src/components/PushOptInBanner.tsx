"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  clearPushDismissFlag,
  dismissPushPrompt,
  getPushBrowserState,
  enablePush,
  isPushPromptDismissed,
  isPushSupported,
} from "@/lib/push";

type Props = {
  /** Показывать только для залогиненного пользователя. */
  hasSession: boolean;
};

type BannerState =
  | "loading"
  | "none"
  | "prompt"
  | "denied_hint"
  | "subscribed_ok"
  | "dismissed_compact"
  | "unsupported";

/** Web Push: крупный приглашение + компактный статус, чтобы блок не «пропадал» без объяснения. */
export function PushOptInBanner({ hasSession }: Props) {
  const [state, setState] = useState<BannerState>("loading");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!hasSession) {
      setState("none");
      return;
    }
    if (!isPushSupported()) {
      setState("unsupported");
      return;
    }

    if (isPushPromptDismissed()) {
      setState("dismissed_compact");
      return;
    }

    try {
      const s = await getPushBrowserState();
      if (s === "unsupported") {
        setState("unsupported");
        return;
      }
      if (s === "subscribed") {
        setState("subscribed_ok");
        return;
      }
      if (s === "denied") {
        setState("denied_hint");
        return;
      }
      setState("prompt");
    } catch {
      setState("none");
    }
  }, [hasSession]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (state === "loading" || state === "none") return null;

  if (state === "subscribed_ok") {
    return (
      <div className="mx-4 mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-600">
        <span className="font-medium text-emerald-700">Уведомления о сообщениях включены</span>
        <span className="text-slate-500">на этом устройстве.</span>
        <Link
          href="/profile"
          className="font-medium text-[#009966] underline-offset-2 hover:underline"
        >
          Настроить в профиле
        </Link>
      </div>
    );
  }

  if (state === "dismissed_compact") {
    return (
      <div className="mx-4 mb-2 rounded-lg border border-slate-200 bg-slate-50/90 px-3 py-2 text-[11px] text-slate-700">
        <span className="mr-2">Напоминание о push отключено на время.</span>
        <button
          type="button"
          onClick={() => {
            clearPushDismissFlag();
            void refresh();
          }}
          className="font-semibold text-[#009966] underline-offset-2 hover:underline"
        >
          Показать снова
        </button>
      </div>
    );
  }

  if (state === "unsupported") {
    return (
      <p className="mx-4 mb-2 text-[11px] text-slate-500">
        Системные push в этом браузере недоступны. Откройте сайт в актуальном Chrome или Edge на
        компьютере.
      </p>
    );
  }

  if (state === "denied_hint") {
    return (
      <div className="mx-4 mb-3 rounded-xl border border-amber-200 bg-amber-50/90 px-3 py-2.5 text-[12px] text-amber-900">
        <p className="font-medium">Уведомления заблокированы в браузере</p>
        <p className="mt-1 text-[11px] leading-snug text-amber-800">
          Откройте настройки сайта (значок замка в адресной строке) и разрешите уведомления для
          zeip, чтобы получать оповещения о новых сообщениях.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-4 mb-3 rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white px-3 py-3 shadow-sm">
      <div className="flex gap-2">
        <div className="flex-1 space-y-1.5">
          <p className="text-sm font-semibold text-slate-900">
            Включите уведомления о сообщениях
          </p>
          <p className="text-[11px] leading-snug text-slate-600">
            Подпишитесь, чтобы получать уведомления о новых сообщениях от пользователей. В
            уведомлении будут видны только имя и профессия отправителя — само сообщение откроется на
            сайте.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                void (async () => {
                  setBusy(true);
                  const r = await enablePush();
                  setBusy(false);
                  if (!r.ok && r.error) {
                    alert(r.error);
                  }
                  void refresh();
                })();
              }}
              className="rounded-lg bg-[#009966] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
            >
              {busy ? "…" : "Включить уведомления"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                dismissPushPrompt();
                setState("dismissed_compact");
              }}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-gray-50"
            >
              Не сейчас
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
