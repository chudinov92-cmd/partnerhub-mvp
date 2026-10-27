// ── Web Push: клиент (браузер) ────────────────────────────────────
export {
  isPushSupported,
  getPushBrowserState,
  enablePush,
  disablePush,
  isPushPromptDismissed,
  dismissPushPrompt,
  clearPushDismissFlag,
  type PushBrowserState,
} from './lib/push/client';

// ── Email: контент и шаблоны (клиент-безопасно) ───────────────────
export {
  getSiteUrl,
  emailMapLink,
  emailMapChatLink,
  pluralContacts,
  wrapTransactionalEmail,
} from './lib/email/content';

// ── UI-компоненты ─────────────────────────────────────────────────
export { PushBootstrap } from './lib/components/PushBootstrap';
export { PushOptInBanner } from './lib/components/PushOptInBanner';
export { PushNotificationsSettings } from './lib/components/PushNotificationsSettings';

// NOTE: Серверные модули (web-push, nodemailer) экспортируются отдельно
// через `@my-startup/notifications/server` — см. libs/notifications/src/server.ts.
