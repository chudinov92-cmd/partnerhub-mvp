import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Браузерный клиент с cookie-сессией (нужно для middleware /admin и SSR).
 * Lock не переопределяем: в браузере Supabase сам использует navigatorLock (Web Locks API).
 * processLock — только для single-process (RN); в браузере даёт таймаут
 * "Acquiring process lock ... sb-supabase-auth-token" при параллельных getUser/getSession.
 */
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    lockAcquireTimeout: 10_000,
  },
});

