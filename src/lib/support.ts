/** Auth UID аккаунта support@zeip.ru */
export const SUPPORT_AUTH_USER_ID = "d469c17a-4756-45a3-a1a6-0487b7a8a7e0";

export const APPEAL_MESSAGE_PREFIX = "__APPEAL__";

export type ParsedAppeal = {
  subject: string;
  description: string;
};

export function getSupportProfileIdFromEnv(): string | null {
  const id = process.env.NEXT_PUBLIC_SUPPORT_PROFILE_ID?.trim();
  return id && id.length >= 32 ? id : null;
}

export function isAppealMessage(content: string | null | undefined): boolean {
  return (content ?? "").startsWith(APPEAL_MESSAGE_PREFIX);
}

export function formatAppealMessage(subject: string, description: string): string {
  const s = subject.trim().slice(0, 200);
  const d = description.trim().slice(0, 2000);
  return `${APPEAL_MESSAGE_PREFIX}\nТема: ${s}\n---\nОписание: ${d}`;
}

export function parseAppealMessage(content: string): ParsedAppeal | null {
  if (!isAppealMessage(content)) return null;
  const body = content.slice(APPEAL_MESSAGE_PREFIX.length).trim();
  const sep = body.indexOf("\n---\n");
  if (sep < 0) return null;
  const head = body.slice(0, sep);
  const description = body.slice(sep + 5).trim();
  const subjectMatch = head.match(/^Тема:\s*([\s\S]*)$/);
  const subject = subjectMatch ? subjectMatch[1].trim() : head.trim();
  if (!subject || !description) return null;
  return { subject, description };
}

export function appealPreviewText(content: string): string {
  const parsed = parseAppealMessage(content);
  if (parsed) return `Обращение: ${parsed.subject}`;
  return content.replace(/\s+/g, " ").trim();
}

/** Событие для открытия чата поддержки с главной (без перезагрузки). */
export const OPEN_SUPPORT_CHAT_EVENT = "zeip:open-support";

/** Текст ошибки из Supabase / fetch (не всегда instanceof Error). */
export function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message.trim()) return err.message;
  if (err && typeof err === "object" && "message" in err) {
    const m = (err as { message: unknown }).message;
    if (typeof m === "string" && m.trim()) return m;
  }
  return fallback;
}

export const SUPPORT_STUB_PROFILE = {
  id: getSupportProfileIdFromEnv() ?? "00000000-0000-0000-0000-000000000000",
  full_name: "Поддержка",
  city: null,
  rating_avg: null,
  rating_count: null,
} as const;
