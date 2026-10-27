"use client";

import { useEffect } from "react";

/** Регистрирует SW для Web Push уведомлений о личных сообщениях. */
export function PushBootstrap() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // тихо — не мешаем основному UI
    });
  }, []);
  return null;
}
