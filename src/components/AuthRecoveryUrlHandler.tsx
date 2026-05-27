"use client";

import { useEffect, useLayoutEffect } from "react";
import {
  isPasswordRecoverySession,
  recoveryCallbackPendingInUrl,
} from "@/lib/authRecovery";
import { supabase } from "@/lib/supabaseClient";

function resetPasswordTarget(): string {
  return `/auth/reset-password${window.location.search}${window.location.hash}`;
}

/**
 * Ссылка из письма иногда открывается на `/` или `/auth` (SITE_URL / старая сессия).
 * Переносим на `/auth/reset-password`, сохраняя query/hash для Supabase.
 */
function redirectToResetPasswordIfNeeded(reason: string) {
  const pathname = window.location.pathname;
  if (pathname === "/auth/reset-password") return;
  const pending = recoveryCallbackPendingInUrl();
  if (!pending && reason !== "session_recovery" && reason !== "PASSWORD_RECOVERY") {
    return;
  }
  window.location.replace(resetPasswordTarget());
}

export function AuthRecoveryUrlHandler() {
  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    if (recoveryCallbackPendingInUrl()) {
      redirectToResetPasswordIfNeeded("url_pending_sync");
    }
  }, []);

  useEffect(() => {
    const goResetPassword = (reason: string) => {
      redirectToResetPasswordIfNeeded(reason);
    };

    if (recoveryCallbackPendingInUrl()) {
      goResetPassword("url_pending_mount");
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        goResetPassword("PASSWORD_RECOVERY");
        return;
      }
      if (
        (event === "SIGNED_IN" || event === "INITIAL_SESSION") &&
        isPasswordRecoverySession(session) &&
        window.location.pathname !== "/auth/reset-password"
      ) {
        goResetPassword("session_recovery");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return null;
}
