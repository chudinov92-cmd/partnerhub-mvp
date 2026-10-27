// Справочник отраслей вынесен в бибилиотеку @my-startup/profile.
// Этот файл остаётся для обратной совместимости импортов `@/lib/industryCatalog`.
export {
  OTHER_INDUSTRY_LABEL,
  type IndustryCatalogRow,
  type SubindustryCatalogRow,
  fetchIndustryCatalogFromDb,
  fetchSubindustryCatalogFromDb,
  loadIndustryCatalog,
  loadSubindustryCatalog,
  upsertIndustry,
  upsertSubindustry,
  sortWithOtherLast,
  getIndustryLabelsForSelect,
  getSubindustryLabelsForSelect,
} from "@my-startup/profile";

