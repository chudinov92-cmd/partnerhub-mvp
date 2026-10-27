"use client";

// Сервис карты профилей вынесен в библиотеку @my-startup/profile.
// Этот файл остаётся для обратной совместимости импортов `@/services/profile/map`.
export {
  PROFILE_MAP_SELECT,
  fetchActiveLocations,
  fetchOwnActiveLocation,
  fetchActiveLocationUserIds,
  fetchProfilesForMap,
  fetchProfileForMapById,
  fetchProfilesInterestedIn,
  type LocationPointRow,
} from "@my-startup/profile";