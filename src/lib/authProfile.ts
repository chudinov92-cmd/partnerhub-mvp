import { createClient } from "@supabase/supabase-js";
import { createSupabaseAdmin } from "@/lib/supabaseAdmin";

/** JWT access token → profiles.id текущего пользователя. */
export async function getProfileIdFromAccessToken(
  accessToken: string,
): Promise<string | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  const userClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const {
    data: { user },
    error,
  } = await userClient.auth.getUser(accessToken);
  if (error || !user) return null;

  const admin = createSupabaseAdmin();
  const { data: profile, error: pErr } = await admin
    .from("profiles")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (pErr || !profile?.id) return null;
  return profile.id as string;
}
