"use client";

// Сервис контактов вынесен в библиотеку @my-startup/profile.
// Этот файл остаётся для обратной совместимости импортов `@/services/contactService`.

export {
  countContactsForOwner,
  fetchContactProfileIds,
  fetchContactProfiles,
  fetchTodayOpenedProfileIds,
  countTodayProfileViews,
  fetchViewedProfileStates,
  getEffectiveViewedProfileIds,
  fetchBlockedProfileIds,
  deleteContact,
  insertContact,
  deleteBlock,
  insertBlock,
  upsertProfileView,
} from "@my-startup/profile";