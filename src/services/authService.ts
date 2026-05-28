"use client";

import type { Session, SupabaseClient, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

export type AuthChangeCallback = Parameters<
  SupabaseClient["auth"]["onAuthStateChange"]
>[0];

/**
 * Текущий пользователь для UI (главная, TopBar, профиль).
 * getSession из storage; если access_token истёк — refresh до PostgREST-запросов.
 */
export async function authGetUser() {
  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession();
  if (sessionError) {
    return { data: { user: null }, error: sessionError };
  }
  const session = sessionData.session;
  if (session?.expires_at && session.expires_at * 1000 < Date.now()) {
    const { data: refreshed, error: refreshError } =
      await supabase.auth.refreshSession();
    if (refreshError) {
      return { data: { user: null }, error: refreshError };
    }
    return {
      data: { user: refreshed.session?.user ?? null },
      error: null,
    };
  }
  return {
    data: { user: session?.user ?? null },
    error: null,
  };
}

export function authSignOut() {
  return supabase.auth.signOut();
}

export function authOnAuthStateChange(cb: AuthChangeCallback) {
  return supabase.auth.onAuthStateChange(cb);
}

export type { Session, User };
