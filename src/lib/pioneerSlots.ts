import { isPioneerPromoEnabled } from "@/lib/pioneerPromo";
import { supabase } from "@/lib/supabaseClient";

const DEFAULT_MAX = 50;

export async function fetchPioneerSlotsRemaining(
  city: string | null | undefined,
): Promise<number | null> {
  if (!isPioneerPromoEnabled()) return 0;
  const trimmed = (city ?? "").trim();
  if (!trimmed) return null;

  const { data, error } = await supabase
    .from("city_pioneer_slots")
    .select("used_count, max_count")
    .eq("city", trimmed)
    .maybeSingle();

  if (error) {
    if (/city_pioneer_slots|relation|column/i.test(error.message)) {
      return DEFAULT_MAX;
    }
    return null;
  }

  if (!data) return DEFAULT_MAX;
  const used = Number(data.used_count ?? 0);
  const max = Number(data.max_count ?? DEFAULT_MAX);
  return Math.max(0, max - used);
}
