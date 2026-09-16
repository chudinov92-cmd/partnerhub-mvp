export function msNow() {
  return Date.now();
}

function toMskMs(utcMs: number) {
  return utcMs + 3 * 60 * 60 * 1000;
}

function toUtcMs(mskMs: number) {
  return mskMs - 3 * 60 * 60 * 1000;
}

function getToday4amMskUtcMs(nowUtcMs: number) {
  const nowMsk = new Date(toMskMs(nowUtcMs));
  const d = new Date(nowMsk);
  d.setHours(4, 0, 0, 0);
  return toUtcMs(d.getTime());
}

/** Обновлять кэш справочника после 04:00 МСК, если последняя загрузка была раньше границы. */
export function shouldRefreshAt4amMsk(
  lastFetchedUtcMs: number | null,
  nowUtcMs: number,
) {
  if (!lastFetchedUtcMs) return true;
  const boundary = getToday4amMskUtcMs(nowUtcMs);
  if (nowUtcMs < boundary) return false;
  return lastFetchedUtcMs < boundary;
}

export type CatalogCacheKeys = {
  dataKey: string;
  fetchedAtKey: string;
};

export function readCatalogCache<T>(keys: CatalogCacheKeys): {
  rows: T[] | null;
  lastFetchedUtcMs: number | null;
} {
  if (typeof window === "undefined") {
    return { rows: null, lastFetchedUtcMs: null };
  }

  let rows: T[] | null = null;
  const cached = window.localStorage.getItem(keys.dataKey);
  if (cached) {
    try {
      rows = JSON.parse(cached) as T[];
    } catch {
      // ignore cache parse errors
    }
  }

  let lastFetchedUtcMs: number | null = null;
  const fetchedAtRaw = window.localStorage.getItem(keys.fetchedAtKey);
  if (fetchedAtRaw) {
    const parsed = Number(fetchedAtRaw);
    if (!Number.isNaN(parsed)) lastFetchedUtcMs = parsed;
  }

  return { rows, lastFetchedUtcMs };
}

export function writeCatalogCache<T>(
  keys: CatalogCacheKeys,
  rows: T[],
  fetchedAtUtcMs: number,
) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(keys.dataKey, JSON.stringify(rows));
  window.localStorage.setItem(keys.fetchedAtKey, String(fetchedAtUtcMs));
}
