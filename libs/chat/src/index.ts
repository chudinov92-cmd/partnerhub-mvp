// ── Сервисы (Supabase-запросы) ──────────────────────────────────────
export * from './lib/services';

// ── REALTIME хук чата ──────────────────────────────────────────────
export { useChatMessagesRealtime } from './lib/hooks/useChatMessagesRealtime';

// ── Утилиты (парсинг сообщений, ссылок, поддержка) ─────────────────
export {
  splitMessageWithLinks,
  normalizeMessageUrl,
  MESSAGE_URL_REGEX,
  type MessageLinkPart,
} from './lib/linkifyMessage';

export {
  SUPPORT_AUTH_USER_ID,
  APPEAL_MESSAGE_PREFIX,
  type ParsedAppeal,
  getSupportProfileIdFromEnv,
  isAppealMessage,
  formatAppealMessage,
  parseAppealMessage,
  appealPreviewText,
  OPEN_SUPPORT_CHAT_EVENT,
  getErrorMessage,
  mapChatErrorMessage,
  getChatErrorMessage,
  SUPPORT_STUB_PROFILE,
} from './lib/support';

export {
  PROFILE_SHARE_PREFIX,
  PROFILE_MAP_QUERY_PARAM,
  PROFILE_SHORT_PATH_PREFIX,
  PROFILE_SHARE_CODE_REGEX,
  type SharedProfilePayload,
  type ProfileShareInput,
  type ZeipProfileLinkRef,
  getSiteOrigin,
  buildProfileMapSharePath,
  buildProfileMapShareUrl,
  buildProfileShortPath,
  buildProfileShortUrl,
  isProfileShareMessage,
  formatProfileShareMessage,
  parseProfileShareMessage,
  profileSharePreviewText,
  parseZeipProfileLink,
  isZeipProfileUrl,
} from './lib/profileShare';

// ── Доменные типы ──────────────────────────────────────────────────
export type {
  ChatMessage,
  ChatListItem,
  Profile,
  ProfileWorkBlock,
  CurrentUser,
  PostCommentRow,
} from './lib/types';

// ── Константы ──────────────────────────────────────────────────────
export { MAX_RELATION_ROWS } from './lib/constants';

// ── События ────────────────────────────────────────────────────────
export {
  USEFUL_CONTACTS_CHANGED_EVENT,
  notifyUsefulContactsChanged,
} from './lib/usefulContactEvents';

// ── Компоненты ─────────────────────────────────────────────────────
export { MessageLinks } from './lib/components/MessageLinks';
export { SupportAppealCard } from './lib/components/SupportAppealCard';
export { ProfileShareCard } from './lib/components/ProfileShareCard';
export { PostComments } from './lib/components/PostComments';
export { ChatDialog } from './lib/components/ChatDialog';
export { ChatsColumn } from './lib/components/ChatsColumn';
export type { ChatDialogProps, ChatsColumnProps, CurrentUserLite, SupportFieldErrors, MobileTab, PaywallCtaContext } from './lib/components/chatWindows.types';
export { isOnline, scrollComposerIntoView, ONLINE_WINDOW_MS } from './lib/utils';
