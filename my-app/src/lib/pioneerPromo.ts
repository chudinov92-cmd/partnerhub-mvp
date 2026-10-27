import { supabase } from "@my-startup/auth";

/** Акция «первые в городе → 90 дней Pro+». Источник истины — БД, не env. */
export async function fetchPioneerPromoEnabled(): Promise<boolean> {
  const { data, error } = await supabase
    .from("pioneer_promo_settings")
    .select("enabled")
    .eq("id", true)
    .maybeSingle();

  if (error || !data) return false;
  return (data as { enabled?: boolean }).enabled === true;
}
