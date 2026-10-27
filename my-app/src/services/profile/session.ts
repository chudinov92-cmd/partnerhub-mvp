"use client";

// Сервис сессии профиля вынесен в библиотеку @my-startup/profile.
// Этот файл остаётся для обратной совместимости импортов `@/services/profile/session`.
export {
  fetchCurrentUserProfileRow,
  updateProfileLastSeen,
  fetchTopBarProfile,
  setProfileMapVisible,
  fetchMapVisible,
  type CurrentProfileRow,
  type TopBarProfileRow,
} from "@my-startup/profile";