import { RECOVERY_REDIRECT_SCRIPT_INLINE } from "@/lib/inlineScripts";

/**
 * Синхронный редирект до React/Supabase: PKCE после письма часто попадает на `/` с ?code=.
 * CSP: sha256-хеш в script-src (см. inlineScripts.ts / csp.ts).
 */
export function RecoveryRedirectScript() {
  return (
    <script
      dangerouslySetInnerHTML={{ __html: RECOVERY_REDIRECT_SCRIPT_INLINE }}
      suppressHydrationWarning
    />
  );
}
