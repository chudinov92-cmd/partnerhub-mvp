import { getSiteUrl, wrapTransactionalEmail } from "@/lib/emailContent";

const USER_AGREEMENT_URL = `${getSiteUrl().replace(/\/$/, "")}/terms/user-agreement`;
const SUPPORT_EMAIL = "support@zeip.ru";

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

export function buildModerationPurgeEmail(params: {
  reason: string;
  reasonNote?: string;
}) {
  const reasonText = moderationReasonLabel(params.reason);
  const note =
    params.reasonNote?.trim() &&
    params.reason !== "other"
      ? ` (${params.reasonNote.trim()})`
      : params.reasonNote?.trim()
        ? `: ${params.reasonNote.trim()}`
        : "";

  const subject = "Ваш профиль на Zeip удалён";
  const text = [
    "Ваш аккаунт и профиль на Zeip удалены за нарушение Пользовательского соглашения.",
    `Основание: ${reasonText}${note}.`,
    "",
    `Пользовательское соглашение: ${USER_AGREEMENT_URL}`,
    "",
    `Повторная регистрация с этого адреса электронной почты недоступна.`,
    `Если вы считаете, что решение принято ошибочно, напишите на ${SUPPORT_EMAIL}.`,
  ].join("\n");

  const html = wrapTransactionalEmail({
    title: subject,
    lead: `Ваш аккаунт и профиль на Zeip удалены за нарушение Пользовательского соглашения. Основание: <strong>${reasonText}</strong>${note ? ` — ${note.replace(/^:\s*/, "")}` : ""}. Повторная регистрация с этого адреса недоступна.`,
    ctaLabel: "Пользовательское соглашение",
    ctaHref: USER_AGREEMENT_URL,
    footer: `Вопросы: ${SUPPORT_EMAIL}. Это письмо отправлено автоматически.`,
  });

  return { subject, text, html };
}
