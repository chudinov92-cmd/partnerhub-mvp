"use client";

import { useEffect, useState } from "react";
import {
  clearAuthCallbackFromUrl,
  completeAuthEmailCallback,
  parseAuthEmailCallbackParams,
} from "@/lib/authEmailCallback";
import { linkAnonymousCookieConsent } from "@/lib/cookieConsent";
import { supabase } from "@/lib/supabaseClient";

export default function AuthCallbackPage() {
  const [message, setMessage] = useState("Подтверждаем email…");

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const params = parseAuthEmailCallbackParams(
        window.location.search,
        window.location.hash,
      );

      const { error, redirectPath } = await completeAuthEmailCallback(
        supabase,
        params,
      );

      if (cancelled) return;

      if (error) {
        const url = new URL("/auth", window.location.origin);
        url.searchParams.set("error", error);
        window.location.replace(url.toString());
        return;
      }

      clearAuthCallbackFromUrl();
      linkAnonymousCookieConsent();
      window.location.replace(redirectPath);
    };

    void run().catch(() => {
      if (!cancelled) {
        setMessage("Не удалось подтвердить email. Перенаправляем…");
        window.location.replace("/auth?error=" + encodeURIComponent("Ошибка подтверждения email"));
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 via-emerald-50/30 to-emerald-50/30 px-3 py-6">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-lg">
        <p className="text-sm text-slate-600">{message}</p>
      </div>
    </div>
  );
}
