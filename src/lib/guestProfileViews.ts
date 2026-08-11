export const GUEST_PROFILE_VIEW_LIMIT = 5;
export const GUEST_PROFILE_VIEWS_STORAGE_KEY = "zeip_guest_profile_views";

function readStoredIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(GUEST_PROFILE_VIEWS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === "string" && id.length > 0);
  } catch {
    return [];
  }
}

function writeStoredIds(ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      GUEST_PROFILE_VIEWS_STORAGE_KEY,
      JSON.stringify(ids.slice(0, GUEST_PROFILE_VIEW_LIMIT + 10)),
    );
  } catch {
    //
  }
}

export function getGuestViewedProfileIds(): string[] {
  return readStoredIds();
}

export function isGuestProfileAlreadyViewed(profileId: string): boolean {
  return readStoredIds().includes(profileId);
}

export function getGuestUniqueViewCount(): number {
  return readStoredIds().length;
}

/** true = можно открыть попап; false = лимит исчерпан для нового id */
export function canGuestOpenProfile(profileId: string): boolean {
  const ids = readStoredIds();
  if (ids.includes(profileId)) return true;
  return ids.length < GUEST_PROFILE_VIEW_LIMIT;
}

/** Записать просмотр; возвращает false если лимит исчерпан */
export function recordGuestProfileView(profileId: string): boolean {
  const ids = readStoredIds();
  if (ids.includes(profileId)) return true;
  if (ids.length >= GUEST_PROFILE_VIEW_LIMIT) return false;
  writeStoredIds([...ids, profileId]);
  return true;
}

export function remainingGuestProfileViews(): number {
  return Math.max(0, GUEST_PROFILE_VIEW_LIMIT - readStoredIds().length);
}

/** true если этот просмотр будет последним бесплатным (5-й уникальный) */
export function isLastFreeGuestView(profileId: string): boolean {
  const ids = readStoredIds();
  if (ids.includes(profileId)) return false;
  return ids.length === GUEST_PROFILE_VIEW_LIMIT - 1;
}
