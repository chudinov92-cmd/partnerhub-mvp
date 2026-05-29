"use client";

import { useEffect } from "react";
import {
  authOnAuthStateChange,
  scheduleProactiveAuthRefresh,
  stopProactiveAuthRefresh,
} from "@/services/authService";
import { supabase } from "@/lib/supabaseClient";

/**
 * Глобальный keep-alive сессии: проактивный refresh до истечения access token.
 * Подключается один раз в root layout.
 */
export function AuthSessionKeeper() {
  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      scheduleProactiveAuthRefresh(data.session);
    });

    const {
      data: { subscription },
    } = authOnAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT") {
        stopProactiveAuthRefresh();
        return;
      }
      if (
        event === "SIGNED_IN" ||
        event === "TOKEN_REFRESHED" ||
        event === "INITIAL_SESSION"
      ) {
        scheduleProactiveAuthRefresh(session);
      }
    });

    return () => {
      subscription.unsubscribe();
      stopProactiveAuthRefresh();
    };
  }, []);

  return null;
}
