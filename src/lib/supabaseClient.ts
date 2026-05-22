import { processLock } from "@supabase/auth-js";
import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Браузерный клиент с cookie-сессией (нужно для middleware /admin и SSR).
 * Раньше использовался createClient → localStorage, middleware не видел вход.
 */
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    lock: processLock,
  },
});

