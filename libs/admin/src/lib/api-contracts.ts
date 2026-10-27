// ── Типы и константы, общие для клиента и сервера ──────────────────
// Импортируются и UI-компонентами, и серверными route handlers.

export type AdminRole = "super_admin" | "moderator" | "support";

export const MODERATION_PURGE_REASONS = [
  { value: "spam", label: "Спам и навязчивая реклама" },
  { value: "harassment", label: "Оскорбления и угрозы" },
  { value: "fraud", label: "Мошенничество" },
  { value: "impersonation", label: "Выдача себя за другое лицо" },
  { value: "illegal", label: "Незаконный контент" },
  { value: "other", label: "Другое нарушение правил" },
] as const;

export type ModerationPurgeReason =
  (typeof MODERATION_PURGE_REASONS)[number]["value"];

export function moderationReasonLabel(reason: string): string {
  return (
    MODERATION_PURGE_REASONS.find((r) => r.value === reason)?.label ?? reason
  );
}

export type AdminSupportChatRow = {
  chatId: string;
  isClosed: boolean;
  userProfileId: string;
  userFullName: string | null;
  userCity: string | null;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
};