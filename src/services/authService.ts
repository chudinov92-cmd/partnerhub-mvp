"use client";

import type { Session, SupabaseClient, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

export type AuthChangeCallback = Parameters<
  SupabaseClient["auth"]["onAuthStateChange"]
>[0];

/** Текущий пользователь авторизации Supabase Auth. */
export async function authGetUser() {
  return supabase.auth.getUser();
}

export function authSignOut() {
  return supabase.auth.signOut();
}

export function authOnAuthStateChange(cb: AuthChangeCallback) {
  return supabase.auth.onAuthStateChange(cb);
}

export type { Session, User };
