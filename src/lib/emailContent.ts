export function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://zeip.ru";
}

export function emailMapLink(campaign: string): string {
  const base = getSiteUrl().replace(/\/$/, "");
  return `${base}/map?utm_source=email&utm_campaign=${encodeURIComponent(campaign)}`;
}

export function pluralContacts(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return "контакт";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "контакта";
  return "контактов";
}

export function wrapTransactionalEmail(params: {
  title: string;
  lead: string;
  ctaLabel: string;
  ctaHref: string;
  footer?: string;
}): string {
  const footer =
    params.footer ??
    "Это письмо отправлено автоматически. Ответы на noreply@zeip.ru не читаются.";

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
        <p style="margin:0 0 24px;font-size:16px;color:#333;">${params.lead}</p>
        <p style="margin:0 0 24px;">
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
