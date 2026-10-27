// Справочник профессий вынесен в бибилиотеку @my-startup/profile.
// Этот файл остаётся для обратной совместимости импортов `@/lib/professionCatalog`.
export {
  OTHER_PROFESSION_LABEL,
  type ProfessionCatalogRow,
  fetchProfessionCatalogFromDb,
  loadProfessionCatalog,
  getProfessionLabelsForSelect,
  ensureProfessionExists,
  upsertProfession,
  syncCustomProfessionToCatalog,
  appendProfessionToCatalog,
  findProfessionByKey,
  findSimilarProfessions,
  normalizeProfessionKey,
  PROFESSION_FUZZY_THRESHOLD,
  resolveProfessionInput,
  shouldUpsertProfession,
} from "@my-startup/profile";
