"use client";

// Редактор профиля вынесен в библиотеку @my-startup/profile.
// Этот файл остаётся для обратной совместимости импортов `@/services/profile/editor`.
export {
  upsertProfilePrivate,
  insertLocation,
  claimPioneerSlot,
  completeOnboarding,
  deleteProfileWork,
  insertProfileWork,
  fetchOrCreateOnboardingProfile,
  fetchOrCreateEditorProfile,
  fetchProfileLastName,
  fetchProfileWorkBlocks,
  fetchLocationForProfile,
  fetchLocationCoordsForProfile,
  updateProfileById,
  upsertActiveLocation,
} from "@my-startup/profile";