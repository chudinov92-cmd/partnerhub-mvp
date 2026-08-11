import { cache } from "react";
import { createSupabaseAdmin } from "@/lib/supabaseAdmin";

export type PublicStats = {
  profileCount: number;
  cityCount: number;
};

export const fetchPublicStats = cache(async (): Promise<PublicStats | null> => {
  try {
    const supabase = createSupabaseAdmin();

    const { count: profileCount, error: countError } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("map_visible", true)
      .is("deleted_at", null);

    if (countError) {
      console.error("[statsPublicService] profile count error:", countError);
      return null;
    }

    const { data: cities, error: citiesError } = await supabase
      .from("profiles")
      .select("city")
      .eq("map_visible", true)
      .is("deleted_at", null)
      .not("city", "is", null);

    if (citiesError) {
      console.error("[statsPublicService] cities error:", citiesError);
      return null;
    }

    const cityCount = new Set(
      (cities ?? [])
        .map((row) => row.city?.trim())
        .filter((city): city is string => Boolean(city)),
    ).size;

    return {
      profileCount: profileCount ?? 0,
      cityCount,
    };
  } catch (error) {
    console.error("[statsPublicService] fetch failed:", error);
    return null;
  }
});

export function formatPublicProfileCount(count: number): string | null {
  if (count < 50) return null;
  const rounded = Math.floor(count / 100) * 100;
  if (rounded < 50) return null;
  return `${rounded.toLocaleString("ru-RU")}+`;
}
