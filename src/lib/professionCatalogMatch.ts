import Fuse from "fuse.js";
import {
  OTHER_PROFESSION_LABEL,
  type ProfessionCatalogRow,
} from "@/lib/professionCatalog.types";

export const PROFESSION_FUZZY_THRESHOLD = 0.6;

const fuseByCatalog = new WeakMap<
  ProfessionCatalogRow[],
  Fuse<ProfessionCatalogRow>
>();

function getFuseForCatalog(
  catalog: ProfessionCatalogRow[],
  threshold: number,
): Fuse<ProfessionCatalogRow> {
  const cached = fuseByCatalog.get(catalog);
  if (cached) return cached;

  const fuse = new Fuse(catalog, {
    keys: ["label"],
    threshold,
    ignoreLocation: true,
    minMatchCharLength: 2,
  });
  fuseByCatalog.set(catalog, fuse);
  return fuse;
}

export function normalizeProfessionKey(label: string | null | undefined): string {
  return (label ?? "").trim().toLowerCase();
}

export function findProfessionByKey(
  catalog: ProfessionCatalogRow[],
  input: string | null | undefined,
): ProfessionCatalogRow | null {
  const key = normalizeProfessionKey(input);
  if (!key) return null;
  return catalog.find((row) => normalizeProfessionKey(row.label) === key) ?? null;
}

export function resolveProfessionInput(
  catalog: ProfessionCatalogRow[],
  input: string | null | undefined,
): string | null {
  return findProfessionByKey(catalog, input)?.label ?? null;
}

export function shouldUpsertProfession(
  catalog: ProfessionCatalogRow[],
  label: string | null | undefined,
): boolean {
  const key = normalizeProfessionKey(label);
  if (!key) return false;
  if (key === normalizeProfessionKey(OTHER_PROFESSION_LABEL)) return false;
  return !findProfessionByKey(catalog, label);
}

export function findSimilarProfessions(
  catalog: ProfessionCatalogRow[],
  input: string | null | undefined,
  opts?: { limit?: number; threshold?: number },
): ProfessionCatalogRow[] {
  const query = (input ?? "").trim();
  if (!query) return [];

  if (findProfessionByKey(catalog, query)) return [];

  const limit = opts?.limit ?? 1;
  const threshold = opts?.threshold ?? PROFESSION_FUZZY_THRESHOLD;

  const fuse = getFuseForCatalog(catalog, threshold);

  return fuse
    .search(query)
    .slice(0, limit)
    .map((result) => result.item);
}

export function appendProfessionToCatalog(
  catalog: ProfessionCatalogRow[],
  label: string,
): ProfessionCatalogRow[] {
  const trimmed = label.trim();
  if (!trimmed || findProfessionByKey(catalog, trimmed)) return catalog;
  return [...catalog, { label: trimmed }].sort((a, b) =>
    a.label.localeCompare(b.label, "ru"),
  );
}
