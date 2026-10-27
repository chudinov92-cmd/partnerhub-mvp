export function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://zeip.ru";
}

export function emailMapLink(campaign: string): string {
  const base = getSiteUrl().replace(/\/$/, "");
  return `${base}/map?utm_source=email&utm_campaign=${encodeURIComponent(campaign)}`;
}

export function emailMapChatLink(
  peerProfileId: string,
  campaign: string,
): string {
  const base = getSiteUrl().replace(/\/$/, "");
  return `${base}/map?chat=${encodeURIComponent(peerProfileId)}&utm_source=email&utm_campaign=${encodeURIComponent(campaign)}`;
}

export function pluralContacts(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return "контакт";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "контакта";
  return "контактов";
}

/** Экранирует пользовательский контент перед вставкой в HTML-шаблон письма. */
export function escapeEmailHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Обрезает текст сообщения до max символов и добавляет многоточие. */
export function truncateEmailText(text: string, max = 200): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max).trimEnd()}\u2026`;
}

/** HTML-блок с именем отправителя, его профессией (если указана) и текстом сообщения. */
export function messagePreviewHtml(params: {
  senderName: string;
  senderRoleTitle?: string | null;
  messageText: string;
}): string {
  const name = escapeEmailHtml(params.senderName);
  const role = params.senderRoleTitle
    ? escapeEmailHtml(params.senderRoleTitle)
    : null;
  const text = escapeEmailHtml(params.messageText);

  const roleLine = role
    ? ` <span style="color:#888;font-weight:normal;">&mdash; ${role}</span>`
    : "";

  return `
        <div style="margin:0 0 24px;padding:16px 18px;border:1px solid #e5e5e5;border-radius:10px;background:#fafafa;">
          <p style="margin:0 0 10px;font-size:15px;font-weight:600;color:#111;">${name}${roleLine}</p>
          <p style="margin:0;font-size:15px;color:#333;white-space:pre-wrap;">${text}</p>
        </div>`;
}

export function wrapTransactionalEmail(params: {
  title: string;
  lead: string;
  ctaLabel: string;
  ctaHref: string;
  footer?: string;
  /** Дополнительный HTML-блок, вставляется перед кнопкой (например, превью сообщения). */
  extraHtml?: string;
}): string {
  const footer =
    params.footer ??
    "Это письмо отправлено автоматически. Ответы на noreply@zeip.ru не читаются.";

  const extra = params.extraHtml
    ? `\n${params.extraHtml}\n`
    : "";

  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${params.title}</title>
</head>
<body style="margin:0;padding:24px;background:#f5f5f5;font-family:system-ui,-apple-system,Segoe UI,sans-serif;line-height:1.5;color:#111;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:0 auto;">
    <tr>
      <td style="background:#fff;border-radius:12px;padding:32px 28px;">
        <p style="margin:0 0 8px;font-size:13px;color:#666;letter-spacing:0.04em;text-transform:uppercase;">Zeip</p>
        <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;">${params.title}</h1>
        <p style="margin:0 0 24px;font-size:16px;color:#333;">${params.lead}</p>${extra}        <p style="margin:0 0 24px;">
          <a href="${params.ctaHref}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;">
            ${params.ctaLabel}
          </a>
        </p>
        <p style="margin:0;font-size:13px;color:#888;">${footer}</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
