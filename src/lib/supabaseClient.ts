import { processLock } from "@supabase/auth-js";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * В браузере по умолчанию GoTrue использует Navigator LockManager; при таймауте
 * включается steal и Chrome/Safari могут кинуть «Lock broken by another request…»
 * (Strict Mode, быстрый reload). processLock — только в рамках вкладки, без steal.
 * На сервере window нет — опции не передаём, остаётся штатный lockNoOp.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    ...(typeof window !== "undefined" ? { lock: processLock } : {}),
  },
});

