import { getSiteUrl, wrapTransactionalEmail } from "@my-startup/notifications";
import { MODERATION_PURGE_REASONS, moderationReasonLabel, type ModerationPurgeReason } from "@my-startup/admin";

export { MODERATION_PURGE_REASONS, moderationReasonLabel };
export type { ModerationPurgeReason };

const USER_AGREEMENT_URL = `${getSiteUrl().replace(/\/$/, "")}/terms/user-agreement`;
const SUPPORT_EMAIL = "support@zeip.ru";

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
