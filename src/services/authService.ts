"use client";

import type { Session, SupabaseClient, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

export type AuthChangeCallback = Parameters<
  SupabaseClient["auth"]["onAuthStateChange"]
>[0];

/**
 * Текущий пользователь для UI (главная, TopBar).
 * Сначала getSession (быстро, из storage), без лишнего getUser при каждом маунте.
 */
export async function authGetUser() {
  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession();
  if (sessionError) {
    return { data: { user: null }, error: sessionError };
  }
  const sessionUser = sessionData.session?.user ?? null;
  if (sessionUser) {
    return { data: { user: sessionUser }, error: null };
  }
  return supabase.auth.getUser();
}

export function authSignOut() {
  return supabase.auth.signOut();
}

export function authOnAuthStateChange(cb: AuthChangeCallback) {
  return supabase.auth.onAuthStateChange(cb);
}

export type { Session, User };
