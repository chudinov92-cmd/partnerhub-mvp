"use client";

import { supabase } from "@/lib/supabaseClient";

export async function fetchUsefulContactsCount(city: string): Promise<number> {
  const { data, error } = await supabase.rpc("get_useful_contacts_users_count", {
    p_city: city,
  });

  if (error) throw error;
  return typeof data === "number" ? data : Number(data ?? 0);
}
