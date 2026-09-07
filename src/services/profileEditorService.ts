"use client";

import { supabase } from "@/lib/supabaseClient";

/** Profile/onboarding editor queries — единая точка доступа к Postgres из UI. */
export function profileTable<T extends string>(table: T) {
  return supabase.from(table);
}

export function profileRpc<T extends string>(
  fn: T,
  args: Record<string, unknown>,
) {
  return supabase.rpc(fn, args);
}
