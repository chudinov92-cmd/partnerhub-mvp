const UNPAID_PIN_VIEW_LIMIT = 5;
const STORAGE_PREFIX = "pinViews_";

export type PinViewsStore = {
  date: string;
  count: number;
};

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function storageKey(profileId: string): string {
  return `${STORAGE_PREFIX}${profileId}`;
}

function readStore(profileId: string): PinViewsStore {
  if (typeof window === "undefined") {
    return { date: todayIsoDate(), count: 0 };
  }
  try {
    const raw = localStorage.getItem(storageKey(profileId));
    if (!raw) return { date: todayIsoDate(), count: 0 };
    const parsed = JSON.parse(raw) as PinViewsStore;
    if (!parsed?.date || typeof parsed.count !== "number") {
      return { date: todayIsoDate(), count: 0 };
    }
    return parsed;
  } catch {
    return { date: todayIsoDate(), count: 0 };
  }
}

function writeStore(profileId: string, store: PinViewsStore): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey(profileId), JSON.stringify(store));
  } catch {
    //
  }
}

function normalizedStore(profileId: string): PinViewsStore {
  const store = readStore(profileId);
  const today = todayIsoDate();
  if (store.date !== today) {
    return { date: today, count: 0 };
  }
  return store;
}

export function getUnpaidPinViewCount(profileId: string): number {
  return normalizedStore(profileId).count;
}

export function canUnpaidOpenPinPopup(profileId: string): boolean {
  return getUnpaidPinViewCount(profileId) < UNPAID_PIN_VIEW_LIMIT;
}

export function recordUnpaidPinPopupView(profileId: string): number {
  const store = normalizedStore(profileId);
  const next = { date: store.date, count: store.count + 1 };
  writeStore(profileId, next);
  return next.count;
}

export { UNPAID_PIN_VIEW_LIMIT };
