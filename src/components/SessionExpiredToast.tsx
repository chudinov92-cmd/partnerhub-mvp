"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AUTH_SESSION_EXPIRED_EVENT } from "@/services/authService";

export function SessionExpiredToast() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  const dismiss = useCallback(() => setVisible(false), []);

  useEffect(() => {
    const onExpired = () => setVisible(true);
    window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, onExpired);
    return () => {
      window.removeEventListener(AUTH_SESSION_EXPIRED_EVENT, onExpired);
    };
  }, []);

  if (!visible || pathname === "/auth" || pathname.startsWith("/auth/")) {
    return null;
  }

  const redirect =
    pathname && pathname !== "/"
      ? `/auth?redirect=${encodeURIComponent(pathname)}`
      : "/auth";

  return (
    <div
      role="status"
      className="fixed bottom-4 left-1/2 z-[2000] flex w-[min(calc(100vw-2rem),28rem)] -translate-x-1/2 items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-lg"
    >
      <p className="min-w-0 flex-1 leading-snug">
        Сессия истекла — войдите снова, чтобы писать в чат и видеть профиль.
      </p>
      <div className="flex shrink-0 items-center gap-2">
        <Link
          href={redirect}
          className="rounded-lg bg-[#009966] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#008855]"
        >
          Войти
        </Link>
        <button
          type="button"
          onClick={dismiss}
          className="rounded-lg px-2 py-1 text-xs text-amber-800 hover:bg-amber-100"
          aria-label="Закрыть"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
