import { supabase } from "@/lib/supabaseClient";
import { maskProfanity } from "@/lib/profanity";
import { INDUSTRY_SEED, SUBINDUSTRY_SEED } from "@/data/industrySeed";

export const OTHER_INDUSTRY_LABEL = "Другое";

function sortRuAsc(a: string, b: string) {
  return a.localeCompare(b, "ru");
}

const LS_INDUSTRY_KEY = "industry_catalog_v2";
const LS_INDUSTRY_FETCHED_AT_KEY = "industry_catalog_fetched_at_v2";
const LS_SUBINDUSTRY_KEY = "subindustry_catalog_v2";
const LS_SUBINDUSTRY_FETCHED_AT_KEY = "subindustry_catalog_fetched_at_v2";

function msNow() {
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

function shouldRefreshAt4amMsk(lastFetchedUtcMs: number | null, nowUtcMs: number) {
  if (!lastFetchedUtcMs) return true;
  const boundary = getToday4amMskUtcMs(nowUtcMs);
  if (nowUtcMs < boundary) return false;
  return lastFetchedUtcMs < boundary;
}

export type IndustryCatalogRow = { label: string };
export type SubindustryCatalogRow = { industry_label: string; label: string };

async function seedIndustryCatalogAuthenticated() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // Best-effort seeding:
  // if insert is denied / table is missing, we don't want to break UI.
  const { error: indErr } = await supabase
    .from("industry_catalog")
    .upsert(
      INDUSTRY_SEED.map((label) => ({ label, is_stock: true })),
      { onConflict: "label" },
    );
  if (indErr) return;

  const { error: subErr } = await supabase
    .from("subindustry_catalog")
    .upsert(
      SUBINDUSTRY_SEED.map((r) => ({ ...r, is_stock: true })),
      { onConflict: "industry_label,label" },
    );
  if (subErr) return;
}

export async function fetchIndustryCatalogFromDb(): Promise<IndustryCatalogRow[]> {
  const { data, error } = await supabase.from("industry_catalog").select("label");
  if (error) throw error;
  const rows = ((data ?? []) as IndustryCatalogRow[]).filter(
    (r) => r.label && r.label !== OTHER_INDUSTRY_LABEL,
  );
  rows.sort((a, b) => sortRuAsc(a.label, b.label));
  return rows;
}

export async function fetchSubindustryCatalogFromDb(): Promise<SubindustryCatalogRow[]> {
  const { data, error } = await supabase
    .from("subindustry_catalog")
    .select("industry_label,label");
  if (error) throw error;
  return (data ?? []) as SubindustryCatalogRow[];
}

export async function loadIndustryCatalog(): Promise<IndustryCatalogRow[]> {
  const nowUtc = msNow();
  let cachedRows: IndustryCatalogRow[] | null = null;

  if (typeof window !== "undefined") {
    const cached = window.localStorage.getItem(LS_INDUSTRY_KEY);
    if (cached) {
      try {
        cachedRows = JSON.parse(cached) as IndustryCatalogRow[];
      } catch {}
    }
  }

  try {
    await seedIndustryCatalogAuthenticated();
  } catch (e) {
    // ignore seeding failures (permissions/tables/etc.)
  }

  let fresh: IndustryCatalogRow[] = [];
  try {
    fresh = await fetchIndustryCatalogFromDb();
  } catch (e) {
    // If DB read fails, keep cached values first; then fallback to hardcoded lists in UI.
    if (cachedRows) return cachedRows;
    return [];
  }
  if (typeof window !== "undefined") {
    window.localStorage.setItem(LS_INDUSTRY_KEY, JSON.stringify(fresh));
    window.localStorage.setItem(LS_INDUSTRY_FETCHED_AT_KEY, String(nowUtc));
  }
  return fresh;
}

export async function loadSubindustryCatalog(): Promise<SubindustryCatalogRow[]> {
  const nowUtc = msNow();
  let cachedRows: SubindustryCatalogRow[] | null = null;

  if (typeof window !== "undefined") {
    const cached = window.localStorage.getItem(LS_SUBINDUSTRY_KEY);
    if (cached) {
      try {
        cachedRows = JSON.parse(cached) as SubindustryCatalogRow[];
      } catch {}
    }
  }

  try {
    await seedIndustryCatalogAuthenticated();
  } catch (e) {
    // ignore seeding failures (permissions/tables/etc.)
  }

  let fresh: SubindustryCatalogRow[] = [];
  try {
    fresh = await fetchSubindustryCatalogFromDb();
  } catch (e) {
    // If DB read fails, keep cached values first; then fallback to hardcoded lists in UI.
    if (cachedRows) return cachedRows;
    return [];
  }
  if (typeof window !== "undefined") {
    window.localStorage.setItem(LS_SUBINDUSTRY_KEY, JSON.stringify(fresh));
    window.localStorage.setItem(LS_SUBINDUSTRY_FETCHED_AT_KEY, String(nowUtc));
  }
  return fresh;
}

export async function upsertIndustry(label: string) {
  const v = maskProfanity((label ?? "").trim());
  if (!v) return;
  if (v === OTHER_INDUSTRY_LABEL) return;
  await supabase
    .from("industry_catalog")
    .upsert({ label: v }, { onConflict: "label" });
}

export async function upsertSubindustry(industryLabel: string, label: string) {
  const ind = maskProfanity((industryLabel ?? "").trim());
  const v = maskProfanity((label ?? "").trim());
  if (!ind || !v) return;
  if (v === OTHER_INDUSTRY_LABEL) return;
  await supabase
    .from("subindustry_catalog")
    .upsert(
      { industry_label: ind, label: v },
      { onConflict: "industry_label,label" },
    );
}

export function sortWithOtherLast(labels: string[]) {
  const rest = labels.filter((x) => x !== OTHER_INDUSTRY_LABEL).slice().sort(sortRuAsc);
  return labels.includes(OTHER_INDUSTRY_LABEL) ? [...rest, OTHER_INDUSTRY_LABEL] : rest;
}

export function getIndustryLabelsForSelect(rows: IndustryCatalogRow[]) {
  return sortWithOtherLast([...rows.map((r) => r.label), OTHER_INDUSTRY_LABEL]);
}

export function getSubindustryLabelsForSelect(
  subRows: SubindustryCatalogRow[],
  industryLabel: string | null | undefined,
) {
  const ind = (industryLabel ?? "").trim();
  if (!ind) return [];
  const labels = subRows
    .filter((r) => r.industry_label === ind)
    .map((r) => r.label)
    .filter(Boolean);
  const sorted = labels.slice().sort(sortRuAsc);
  return sortWithOtherLast([...sorted, OTHER_INDUSTRY_LABEL]);
}

