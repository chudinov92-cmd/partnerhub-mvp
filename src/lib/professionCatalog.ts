import { supabase } from "@/lib/supabaseClient";
import { PROFESSION_CATALOG_SEED } from "@/data/professionsSeed";
import { maskProfanity } from "@/lib/profanity";

export type ProfessionCatalogRow = {
  label: string;
};

export const OTHER_PROFESSION_LABEL = "Другое";

const LS_KEY = "profession_catalog_v2";
const LS_FETCHED_AT_KEY = "profession_catalog_fetched_at_v2";

function sortRuAsc(a: string, b: string) {
  return a.localeCompare(b, "ru");
}

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
  // remove any legacy "Другое…" records from DB (handled as synthetic option)
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
    .upsert(PROFESSION_CATALOG_SEED, { onConflict: "label" });
  if (seedErr) return;
}

export async function loadProfessionCatalog(): Promise<ProfessionCatalogRow[]> {
  const nowUtc = msNow();

  if (typeof window !== "undefined") {
    const cached = window.localStorage.getItem(LS_KEY);
    const fetchedAtRaw = window.localStorage.getItem(LS_FETCHED_AT_KEY);
    const fetchedAt = fetchedAtRaw ? Number(fetchedAtRaw) : null;

    if (cached && fetchedAt && !shouldRefreshAt4amMsk(fetchedAt, nowUtc)) {
      try {
        const parsed = JSON.parse(cached) as ProfessionCatalogRow[];
        return parsed;
      } catch {
        // ignore cache parse errors
      }
    }
  }

  // Ensure initial data exists (best-effort; requires auth and insert policy)
  await seedCatalogIfEmptyAuthenticated();

  const fresh = await fetchProfessionCatalogFromDb();
  if (typeof window !== "undefined") {
    window.localStorage.setItem(LS_KEY, JSON.stringify(fresh));
    window.localStorage.setItem(LS_FETCHED_AT_KEY, String(nowUtc));
  }
  return fresh;
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
  if (v === OTHER_PROFESSION_LABEL || v === "Другое…") return;

  await supabase
    .from("profession_catalog")
    .upsert({ label: v }, { onConflict: "label" });
}

