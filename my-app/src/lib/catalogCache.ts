// Кэш справочников вынесен в бибилиотеку @my-startup/profile.
// Этот файл остаётся для обратной совместимости импортов `@/lib/catalogCache`.
export {
  msNow,
  readCatalogCache,
  shouldRefreshAt4amMsk,
  writeCatalogCache,
  type CatalogCacheKeys,
} from "@my-startup/profile";
