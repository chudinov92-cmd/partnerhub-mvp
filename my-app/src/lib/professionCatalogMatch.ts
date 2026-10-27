// Матчинг профессий вынесен в бибилиотеку @my-startup/profile.
// Этот файл остаётся для обратной совместимости импортов `@/lib/professionCatalogMatch`.
export {
  appendProfessionToCatalog,
  findProfessionByKey,
  findSimilarProfessions,
  normalizeProfessionKey,
  PROFESSION_FUZZY_THRESHOLD,
  resolveProfessionInput,
  shouldUpsertProfession,
} from "@my-startup/profile";
