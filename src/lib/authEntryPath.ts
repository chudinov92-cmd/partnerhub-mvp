import { fetchCurrentUserProfileRow } from "@/services/profileService";

/** Безопасный относительный путь из ?redirect= (без open redirect). */
export function sanitizeAuthRedirect(
  raw: string | null | undefined,
): string | null {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

/**
 * Куда отправить уже авторизованного пользователя после входа или при заходе на /auth.
 * Явный ?redirect= (кроме /onboarding) имеет приоритет; иначе — по onboarding_completed.
 */
export async function resolveAuthedAppEntryPath(
  authUserId: string,
  redirectParam?: string | null,
): Promise<string> {
  const explicit = sanitizeAuthRedirect(redirectParam);
  if (explicit && explicit !== "/onboarding") {
    return explicit;
  }

  const profile = await fetchCurrentUserProfileRow(authUserId);
  if (profile?.onboarding_completed) {
    return "/map";
  }

  return "/onboarding";
}
