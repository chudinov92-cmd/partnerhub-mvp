import type { SupabaseClient } from "@supabase/supabase-js";
import {
  SUPPORT_AUTH_USER_ID,
  getSupportProfileIdFromEnv,
} from "@/lib/support";

export async function resolveSupportProfileId(
  adminSb: SupabaseClient,
): Promise<string> {
  const fromEnv = getSupportProfileIdFromEnv();
  if (fromEnv) return fromEnv;

  const { data, error } = await adminSb
    .from("profiles")
    .select("id")
    .eq("auth_user_id", SUPPORT_AUTH_USER_ID)
    .maybeSingle();
  if (error) throw error;
  const id = (data as { id?: string } | null)?.id;
  if (!id) {
    throw new Error("Профиль поддержки не найден");
  }
  return id;
}
