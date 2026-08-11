export const WELCOME_ONBOARDING_KEY = "welcome_onboarding_v1";

export function isWelcomeOnboardingShown(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(WELCOME_ONBOARDING_KEY) === "1";
}

export function markWelcomeOnboardingShown(): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(WELCOME_ONBOARDING_KEY, "1");
}

export function shouldShowWelcomeOnboarding(params: {
  isAuthed: boolean;
  profileCity: string | null | undefined;
}): boolean {
  if (!params.isAuthed) return false;
  if (params.profileCity?.trim()) return false;
  if (isWelcomeOnboardingShown()) return false;
  return true;
}
