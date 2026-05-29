"use client";

import type { Session, SupabaseClient, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

export type AuthChangeCallback = Parameters<
  SupabaseClient["auth"]["onAuthStateChange"]
>[0];

export type AuthGetUserResult = {
  data: { user: User | null };
  error: Error | null;
  /** true, если была сессия с протухшим access token, но refresh не удался */
  sessionExpired?: boolean;
};

export const AUTH_SESSION_EXPIRED_EVENT = "zeip:auth-session-expired";

export const AUTH_OPERATION_TIMEOUT_MS = 8_000;
export const PROACTIVE_REFRESH_BEFORE_EXPIRY_MS = 60_000;

let authGetUserInFlight: Promise<AuthGetUserResult> | null = null;
let proactiveRefreshTimer: ReturnType<typeof setTimeout> | null = null;

function withAuthTimeout<T>(
  promise: Promise<T>,
  label: string,
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(
        () => reject(new Error(`${label} timeout after ${AUTH_OPERATION_TIMEOUT_MS}ms`)),
        AUTH_OPERATION_TIMEOUT_MS,
      );
    }),
  ]);
}

export function dispatchAuthSessionExpired(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(AUTH_SESSION_EXPIRED_EVENT));
}

async function clearLocalSession(): Promise<void> {
  try {
    await withAuthTimeout(
      supabase.auth.signOut({ scope: "local" }),
      "signOut(local)",
    );
  } catch {
    // best-effort
  }
}

async function authRefreshSessionInternal() {
  try {
    return await withAuthTimeout(
      supabase.auth.refreshSession(),
      "refreshSession",
    );
  } catch (err) {
    return {
      data: { session: null, user: null },
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

/**
 * Явный refresh (проактивный таймер, восстановление сессии).
 */
export async function authRefreshSession() {
  return authRefreshSessionInternal();
}

/**
 * Планирует refresh за ~60 с до истечения access token.
 */
export function scheduleProactiveAuthRefresh(session: Session | null): void {
  if (proactiveRefreshTimer) {
    clearTimeout(proactiveRefreshTimer);
    proactiveRefreshTimer = null;
  }
  if (!session?.expires_at) return;

  const expiresAtMs = session.expires_at * 1000;
  const refreshAtMs = expiresAtMs - PROACTIVE_REFRESH_BEFORE_EXPIRY_MS;
  const delay = Math.max(refreshAtMs - Date.now(), 0);

  proactiveRefreshTimer = setTimeout(() => {
    proactiveRefreshTimer = null;
    void (async () => {
      const { data, error } = await authRefreshSessionInternal();
      if (error || !data.session) {
        await clearLocalSession();
        dispatchAuthSessionExpired();
        return;
      }
      scheduleProactiveAuthRefresh(data.session);
    })();
  }, delay);
}

export function stopProactiveAuthRefresh(): void {
  if (proactiveRefreshTimer) {
    clearTimeout(proactiveRefreshTimer);
    proactiveRefreshTimer = null;
  }
}

/**
 * Текущий пользователь для UI (главная, TopBar, профиль).
 * getSession из storage; если access_token истёк — refresh до PostgREST-запросов.
 * Параллельные вызовы дедуплицируются — один lock Supabase Auth на всех.
 */
async function authGetUserImpl(): Promise<AuthGetUserResult> {
  let hadExpiredSession = false;

  try {
    const { data: sessionData, error: sessionError } = await withAuthTimeout(
      supabase.auth.getSession(),
      "getSession",
    );

    if (sessionError) {
      return { data: { user: null }, error: sessionError };
    }

    const session = sessionData.session;

    if (session?.expires_at && session.expires_at * 1000 < Date.now()) {
      hadExpiredSession = true;
      const { data: refreshed, error: refreshError } =
        await authRefreshSessionInternal();

      if (refreshError || !refreshed.session?.user) {
        await clearLocalSession();
        if (hadExpiredSession) {
          dispatchAuthSessionExpired();
        }
        return {
          data: { user: null },
          error: refreshError ?? new Error("refreshSession failed"),
          sessionExpired: hadExpiredSession,
        };
      }

      scheduleProactiveAuthRefresh(refreshed.session);
      return {
        data: { user: refreshed.session.user },
        error: null,
      };
    }

    if (session) {
      scheduleProactiveAuthRefresh(session);
    }

    return {
      data: { user: session?.user ?? null },
      error: null,
    };
  } catch (err) {
    if (hadExpiredSession) {
      await clearLocalSession();
      dispatchAuthSessionExpired();
    }
    return {
      data: { user: null },
      error: err instanceof Error ? err : new Error(String(err)),
      sessionExpired: hadExpiredSession,
    };
  }
}

export async function authGetUser(): Promise<AuthGetUserResult> {
  if (authGetUserInFlight) {
    return authGetUserInFlight;
  }
  authGetUserInFlight = authGetUserImpl().finally(() => {
    authGetUserInFlight = null;
  });
  return authGetUserInFlight;
}

export function authSignOut() {
  stopProactiveAuthRefresh();
  return supabase.auth.signOut();
}

export function authOnAuthStateChange(cb: AuthChangeCallback) {
  return supabase.auth.onAuthStateChange(cb);
}

export type { Session, User };
