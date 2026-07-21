import { CITY_OPTIONS, RUSSIA_LABEL } from "@/data/cities";

export { RUSSIA_LABEL };

export const CITY_ONBOARDING_ACK_KEY = "city_onboarding_acknowledged";

export function isSpecificCity(city: string): boolean {
  return city !== RUSSIA_LABEL && CITY_OPTIONS.includes(city);
}

export function isCityOnboardingAcknowledged(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(CITY_ONBOARDING_ACK_KEY) === "1";
}

export function acknowledgeCityOnboarding(): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CITY_ONBOARDING_ACK_KEY, "1");
}

export function getStoredSelectedCity(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("selected_city");
}

export function shouldShowCityOnboarding(params: {
  selectedCity: string;
  profileCity: string | null | undefined;
  isAuthed: boolean;
  acknowledged: boolean;
}): boolean {
  if (params.isAuthed) return false;
  if (params.acknowledged) return false;
  if (params.selectedCity === RUSSIA_LABEL) return true;
  return false;
}
