"use client";

import { useCallback, useEffect, useState } from "react";
import {
  disablePush,
  enablePush,
  getPushBrowserState,
  isPushSupported,
} from "@/lib/push";

/** Блок на /settings: отключение push на этом устройстве. */
export function PushNotificationsSettings() {
  const [state, setState] = useState<
    "loading" | "unsupported" | "denied" | "off" | "on"
  >("loading");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!isPushSupported()) {
      setState("unsupported");
      return;
    }
    const s = await getPushBrowserState();
    if (s === "unsupported") setState("unsupported");
    else if (s === "denied") setState("denied");
    else if (s === "subscribed") setState("on");
    else setState("off");
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (state === "loading" || state === "unsupported") return null;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <div className="rounded-xl bg-gradient-to-br from-[#009966] to-emerald-600 p-2">
          <img
            src="/Icons/Bell.svg"
            alt=""
            className="h-5 w-5"
            aria-hidden
          />
        </div>
        <h2 className="text-xl font-semibold text-slate-900">Уведомления</h2>
      </div>

      {state === "denied" ? (
        <p className="text-sm text-amber-800">
          Уведомления заблокированы в браузере. Откройте настройки сайта, чтобы
          разрешить их, затем включите push в разделе «Мои чаты».
        </p>
      ) : state === "on" ? (
        <div className="space-y-2">
          <p className="text-sm text-slate-700">
            <span className="font-medium text-slate-900">
              Push-уведомления о сообщениях
            </span>{" "}
            включены на этом устройстве. Мы пришлём короткое уведомление с именем
            и профессией отправителя при новом сообщении в личном чате.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              void (async () => {
                setBusy(true);
                const r = await disablePush();
                setBusy(false);
                if (!r.ok && r.error) alert(r.error);
                void refresh();
              })();
            }}
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800 hover:bg-red-100 disabled:opacity-50"
          >
            {busy ? "…" : "Отключить на этом устройстве"}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-slate-700">
            Получайте уведомления о новых сообщениях от пользователей. Включите
            их в разделе{" "}
            <span className="font-medium text-slate-900">«Мои чаты»</span> на
            главной странице (кнопка «Включить уведомления»).
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              void (async () => {
                setBusy(true);
                const r = await enablePush();
                setBusy(false);
                if (!r.ok && r.error) alert(r.error);
                void refresh();
              })();
            }}
            className="rounded-lg bg-[#009966] px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {busy ? "…" : "Включить здесь"}
          </button>
        </div>
      )}
    </div>
  );
}
