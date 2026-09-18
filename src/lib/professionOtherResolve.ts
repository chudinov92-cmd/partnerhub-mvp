import {
  findProfessionByKey,
  findSimilarProfessions,
  normalizeProfessionKey,
  resolveProfessionInput,
  syncCustomProfessionToCatalog,
  type ProfessionCatalogRow,
} from "@/lib/professionCatalog";

export type ProfessionResolveResult =
  | { action: "canonical"; label: string }
  | { action: "custom"; label: string }
  | { action: "cancel" };

export function getProfessionResolvePreview(
  catalog: ProfessionCatalogRow[],
  input: string | null | undefined,
  opts?: { dismissedKeys?: ReadonlySet<string> },
): ProfessionResolveResult | { action: "suggest"; label: string; input: string } | null {
  const trimmed = (input ?? "").trim();
  if (!trimmed) return null;

  const canonical = resolveProfessionInput(catalog, trimmed);
  if (canonical) {
    return { action: "canonical", label: canonical };
  }

  const dismissedKeys = opts?.dismissedKeys;
  const inputKey = normalizeProfessionKey(trimmed);
  if (dismissedKeys?.has(inputKey)) {
    return { action: "custom", label: trimmed };
  }

  const similar = findSimilarProfessions(catalog, trimmed, { limit: 1 })[0];
  if (similar) {
    return { action: "suggest", label: similar.label, input: trimmed };
  }

  return { action: "custom", label: trimmed };
}

export function resolveProfessionForSave(
  catalog: ProfessionCatalogRow[],
  input: string | null | undefined,
  opts?: { dismissedKeys?: ReadonlySet<string> },
): ProfessionResolveResult | { action: "suggest"; label: string; input: string } {
  const preview = getProfessionResolvePreview(catalog, input, opts);
  if (!preview) {
    return { action: "custom", label: (input ?? "").trim() };
  }
  return preview;
}

export type FinalizeProfessionLabelResult =
  | {
      cancelled: false;
      label: string;
      catalog: ProfessionCatalogRow[];
      usedCanonical: boolean;
    }
  | { cancelled: true };

export async function finalizeProfessionLabel(
  catalog: ProfessionCatalogRow[],
  input: string,
  resolveForSave: (
    value: string,
    catalogOverride?: ProfessionCatalogRow[],
  ) => Promise<ProfessionResolveResult>,
): Promise<FinalizeProfessionLabelResult> {
  const trimmed = input.trim();
  const existing = findProfessionByKey(catalog, trimmed);
  if (existing) {
    return {
      cancelled: false,
      label: existing.label,
      catalog,
      usedCanonical: true,
    };
  }

  const resolved = await resolveForSave(trimmed, catalog);
  if (resolved.action === "cancel") {
    return { cancelled: true };
  }
  if (resolved.action === "canonical") {
    return {
      cancelled: false,
      label: resolved.label,
      catalog,
      usedCanonical: true,
    };
  }

  const nextCatalog = await syncCustomProfessionToCatalog(catalog, resolved.label);
  return {
    cancelled: false,
    label: resolved.label,
    catalog: nextCatalog,
    usedCanonical: false,
  };
}
