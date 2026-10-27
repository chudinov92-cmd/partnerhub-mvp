import { supabase } from "@my-startup/auth";
import { PROFESSION_CATALOG_SEED } from "./seeds/professionsSeed";
import { maskProfanity } from "./profanity";
import {
  msNow,
  readCatalogCache,
  shouldRefreshAt4amMsk,
  writeCatalogCache,
} from "./catalogCache";
import {
  appendProfessionToCatalog,
  normalizeProfessionKey,
  shouldUpsertProfession,
} from "./professionCatalogMatch";
import {
  OTHER_PROFESSION_LABEL,
  type ProfessionCatalogRow,
} from "./professionCatalog.types";

export type { ProfessionCatalogRow } from "./professionCatalog.types";
export { OTHER_PROFESSION_LABEL } from "./professionCatalog.types";
export {
  appendProfessionToCatalog,
  findProfessionByKey,
  findSimilarProfessions,
  normalizeProfessionKey,
  PROFESSION_FUZZY_THRESHOLD,
  resolveProfessionInput,
  shouldUpsertProfession,
} from "./professionCatalogMatch";

const LS_KEY = "profession_catalog_v2";
const LS_FETCHED_AT_KEY = "profession_catalog_fetched_at_v2";
const CACHE_KEYS = { dataKey: LS_KEY, fetchedAtKey: LS_FETCHED_AT_KEY };

function sortRuAsc(a: string, b: string) {
  return a.localeCompare(b, "ru");
}

function sortWithOtherLast(labels: string[]) {
  const rest = labels.filter((x) => x !== OTHER_PROFESSION_LABEL).slice().sort(sortRuAsc);
  return [...rest, OTHER_PROFESSION_LABEL];
}

export async function fetchProfessionCatalogFromDb(): Promise<ProfessionCatalogRow[]> {
  const { data, error } = await supabase
    .from("profession_catalog")
    .select("label");

  if (error) throw error;
  const rows = (data ?? []) as ProfessionCatalogRow[];
  const filtered = rows.filter(
    (r) => r.label && r.label !== "Другое…" && r.label !== OTHER_PROFESSION_LABEL,
  );
  filtered.sort((a, b) => sortRuAsc(a.label, b.label));
  return filtered;
}

async function seedCatalogIfEmptyAuthenticated() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { count, error: countErr } = await supabase
    .from("profession_catalog")
    .select("*", { count: "exact", head: true });

  if (countErr) return;
  if ((count ?? 0) > 0) return;

  const { error: seedErr } = await supabase
    .from("profession_catalog")
    .upsert(
      PROFESSION_CATALOG_SEED.map((r) => ({ ...r, is_stock: true })),
      { onConflict: "label" },
    );
  if (seedErr) return;
}

export async function loadProfessionCatalog(): Promise<ProfessionCatalogRow[]> {
  const nowUtc = msNow();
  const { rows: cachedRows, lastFetchedUtcMs } =
    readCatalogCache<ProfessionCatalogRow>(CACHE_KEYS);

  if (
    cachedRows &&
    cachedRows.length > 0 &&
    !shouldRefreshAt4amMsk(lastFetchedUtcMs, nowUtc)
  ) {
    return cachedRows;
  }

  try {
    await seedCatalogIfEmptyAuthenticated();
  } catch {
    // ignore seed errors; we'll still try to fetch or fallback to cache
  }

  try {
    const fresh = await fetchProfessionCatalogFromDb();
    writeCatalogCache(CACHE_KEYS, fresh, nowUtc);
    return fresh;
  } catch {
    if (cachedRows) return cachedRows;
    return [];
  }
}

export function getProfessionLabelsForSelect(rows: ProfessionCatalogRow[]) {
  return sortWithOtherLast(rows.map((r) => r.label));
}

export async function ensureProfessionExists(label: string) {
  await upsertProfession(label, []);
}

export async function upsertProfession(label: string, specialties: string[] = []) {
  void specialties;
  const v = maskProfanity((label ?? "").trim());
  if (!v) return;
  const key = normalizeProfessionKey(v);
  if (!key || key === normalizeProfessionKey(OTHER_PROFESSION_LABEL)) return;

  await supabase
    .from("profession_catalog")
    .upsert({ label: v, label_key: key }, { onConflict: "label_key", ignoreDuplicates: true });
}

export async function syncCustomProfessionToCatalog(
  catalog: ProfessionCatalogRow[],
  label: string,
): Promise<ProfessionCatalogRow[]> {
  if (!shouldUpsertProfession(catalog, label)) return catalog;
  try {
    await upsertProfession(label);
  } catch {
    // best-effort
  }
  return appendProfessionToCatalog(catalog, label);
}