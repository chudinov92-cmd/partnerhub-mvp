/** Разбиение текста сообщения на plain-текст и URL (без HTML). */

export type MessageLinkPart =
  | { type: "text"; value: string }
  | { type: "url"; value: string; href: string };

/** http(s)://... или www.... — без захвата хвостовой пунктуации. */
export const MESSAGE_URL_REGEX =
  /(?:https?:\/\/[^\s<>"']+|www\.[^\s<>"']+)/gi;

const TRAILING_PUNCT = /[),.;!?]+$/;

export function normalizeMessageUrl(raw: string): string {
  const trimmed = raw.trim();
  if (/^www\./i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return trimmed;
}

export function splitMessageWithLinks(content: string): MessageLinkPart[] {
  if (!content) return [];

  const parts: MessageLinkPart[] = [];
  let lastIndex = 0;
  const re = new RegExp(MESSAGE_URL_REGEX.source, MESSAGE_URL_REGEX.flags);

  for (const match of content.matchAll(re)) {
    const start = match.index ?? 0;
    if (start > lastIndex) {
      parts.push({ type: "text", value: content.slice(lastIndex, start) });
    }

    let urlText = match[0];
    let trailing = "";
    const punctMatch = urlText.match(TRAILING_PUNCT);
    if (punctMatch) {
      trailing = punctMatch[0];
      urlText = urlText.slice(0, -trailing.length);
    }

    parts.push({
      type: "url",
      value: urlText,
      href: normalizeMessageUrl(urlText),
    });

    if (trailing) {
      parts.push({ type: "text", value: trailing });
    }

    lastIndex = start + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push({ type: "text", value: content.slice(lastIndex) });
  }

  return parts.length > 0 ? parts : [{ type: "text", value: content }];
}
