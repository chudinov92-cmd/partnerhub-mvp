import { fetchCurrentUserProfileRow } from "@/services/profileService";

export type LandingHeroCta = {
  href: string;
  label: string;
  ariaLabel: string;
  /** Cookie JWT без профиля (hard-delete) — сбросить local session. */
  signOutLocal?: boolean;
};

export const LANDING_GUEST_CTA: LandingHeroCta = {
  href: "/auth?mode=signup",
  label: "Присоединиться",
  ariaLabel: "Присоединиться",
};

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

/**
 * CTA героя лендинга. «Войти» больше не ведёт на /onboarding:
 * гость и сессия без профиля → регистрация; незакрытый квиз → «Продолжить».
 */
export async function resolveLandingHeroCta(
  authUserId: string | null,
): Promise<LandingHeroCta> {
  if (!authUserId) {
    return { ...LANDING_GUEST_CTA };
  }

  const profile = await fetchCurrentUserProfileRow(authUserId);
  if (!profile) {
    return { ...LANDING_GUEST_CTA, signOutLocal: true };
  }

  if (profile.onboarding_completed) {
    return { href: "/map", label: "На карту", ariaLabel: "На карту" };
  }

  return {
    href: "/onboarding",
    label: "Продолжить",
    ariaLabel: "Продолжить анкету",
  };
}
