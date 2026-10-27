"use client";

// Сервис лайков профиля вынесен в библиотеку @my-startup/profile.
// Этот файл остаётся для обратной совместимости импортов `@/services/profile/likes`.
export {
  fetchProfileLikeCount,
  fetchViewerHasLiked,
  removeProfileLike,
  insertProfileLike,
  resolveProfileShareCode,
} from "@my-startup/profile";