// Доменные типы вынесены в библиотеку @my-startup/profile.
// Этот файл остаётся для обратной совместимости импортов `@/types` в приложении.
export type {
  Post,
  Profile,
  ProfileWorkBlock,
  FeedFilters,
  CurrentUser,
} from "@my-startup/profile";
export { DEFAULT_FEED_FILTERS } from "@my-startup/profile";

// ChatMessage/ChatListItem живут в @my-startup/chat — реэкспортируем напрямую,
// чтобы библиотека @my-startup/profile не зависела от чата.
export type { ChatMessage, ChatListItem } from "@my-startup/chat";
