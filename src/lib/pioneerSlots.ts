import { supabase } from "@/lib/supabaseClient";
import { defaultPioneerMaxForCity } from "@/lib/pioneerLimits";

export { defaultPioneerMaxForCity } from "@/lib/pioneerLimits";
export {
  PIONEER_DEFAULT_MAX,
  PIONEER_PERM_CITY,
  PIONEER_PERM_MAX,
} from "@/lib/pioneerLimits";

export async function fetchPioneerSlotsRemaining(
  city: string | null | undefined,
): Promise<number | null> {
  const trimmed = (city ?? "").trim();
  if (!trimmed) return null;

  const fallback = defaultPioneerMaxForCity(trimmed);

  const { data, error } = await supabase
    .from("city_pioneer_slots")
    .select("used_count, max_count")
    .eq("city", trimmed)
    .maybeSingle();

  if (error) {
    if (/city_pioneer_slots|relation|column/i.test(error.message)) {
      return fallback;
    }
    return null;
  }

  if (!data) return fallback;
  const used = Number(data.used_count ?? 0);
  const max = Number(data.max_count ?? fallback);
  return Math.max(0, max - used);
}
