"use client";

// Матчинг профилей вынесен в библиотеку @my-startup/profile.
// Этот файл остаётся для обратной совместимости импортов `@/services/profile/match`.
export {
  getProfessionMatchIndex,
  profileMatchesProfession,
  parseInterestedProfessions,
  serializeInterestedProfessions,
  profileInterestedInProfession,
} from "@my-startup/profile";