export const PROFILE_SHARE_PREFIX = "__PROFILE_SHARE__";
export const PROFILE_MAP_QUERY_PARAM = "profile";
export const PROFILE_SHORT_PATH_PREFIX = "/p/";

/** Алфавит коротких кодов (без 0OIl1). */
export const PROFILE_SHARE_CODE_REGEX =
  /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz]{8}$/;

export function getSiteOrigin(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  if (typeof window !== "undefined") return window.location.origin;
  return "https://zeip.ru";
}

export function buildProfileMapSharePath(profileId: string): string {
  const id = profileId.trim();
  return `/map?${PROFILE_MAP_QUERY_PARAM}=${encodeURIComponent(id)}`;
}

export function buildProfileMapShareUrl(profileId: string): string {
  return `${getSiteOrigin()}${buildProfileMapSharePath(profileId)}`;
}

export function buildProfileShortPath(code: string): string {
  return `${PROFILE_SHORT_PATH_PREFIX}${encodeURIComponent(code.trim())}`;
}

export function buildProfileShortUrl(code: string): string {
  return `${getSiteOrigin()}${buildProfileShortPath(code)}`;
}

export type ZeipProfileLinkRef =
  | { kind: "profile_id"; profileId: string }
  | { kind: "share_code"; code: string };

export type SharedProfilePayload = {
  id: string;
  name: string;
  role_title: string | null;
  city: string | null;
};

export type ProfileShareInput = {
  id: string;
  full_name?: string | null;
  role_title?: string | null;
  city?: string | null;
};

export function isProfileShareMessage(content: string | null | undefined): boolean {
  return (content ?? "").startsWith(PROFILE_SHARE_PREFIX);
}

export function formatProfileShareMessage(profile: ProfileShareInput): string {
  const payload: SharedProfilePayload = {
    id: profile.id,
    name: (profile.full_name ?? "").trim().slice(0, 120) || "Пользователь",
    role_title: profile.role_title?.trim().slice(0, 120) ?? null,
    city: profile.city?.trim().slice(0, 80) ?? null,
  };
  return `${PROFILE_SHARE_PREFIX}\n${JSON.stringify(payload)}`;
}

export function parseProfileShareMessage(content: string): SharedProfilePayload | null {
  if (!isProfileShareMessage(content)) return null;
  const body = content.slice(PROFILE_SHARE_PREFIX.length).trim();
  try {
    const parsed = JSON.parse(body) as Partial<SharedProfilePayload>;
    if (!parsed.id || typeof parsed.id !== "string") return null;
    return {
      id: parsed.id,
      name: String(parsed.name ?? "Пользователь").trim() || "Пользователь",
      role_title: parsed.role_title ?? null,
      city: parsed.city ?? null,
    };
  } catch {
    return null;
  }
}

export function profileSharePreviewText(content: string): string {
  const parsed = parseProfileShareMessage(content);
  if (parsed) return `Профиль: ${parsed.name}`;
  return content.replace(/\s+/g, " ").trim();
}

function parseProfileIdFromMapPath(pathname: string, search: string): string | null {
  if (!pathname.startsWith("/map")) return null;
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const id = params.get(PROFILE_MAP_QUERY_PARAM)?.trim();
  if (!id) return null;
  return id;
}

function parseShareCodeFromPath(pathname: string): string | null {
  if (!pathname.startsWith(PROFILE_SHORT_PATH_PREFIX)) return null;
  const raw = pathname.slice(PROFILE_SHORT_PATH_PREFIX.length).split("/")[0]?.trim();
  if (!raw || !PROFILE_SHARE_CODE_REGEX.test(raw)) return null;
  return raw;
}

/** Распознаёт zeip-ссылку на профиль в URL или path. */
export function parseZeipProfileLink(input: string): ZeipProfileLinkRef | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  try {
    const asUrl = trimmed.includes("://") ? new URL(trimmed) : null;
    if (asUrl) {
      const host = asUrl.hostname.toLowerCase();
      const isZeip =
        host === "zeip.ru" ||
        host === "www.zeip.ru" ||
        host.endsWith(".zeip.ru") ||
        (typeof window !== "undefined" && host === window.location.hostname);

      if (!isZeip && host !== "localhost" && !host.endsWith(".localhost")) {
        return null;
      }

      const fromShort = parseShareCodeFromPath(asUrl.pathname);
      if (fromShort) return { kind: "share_code", code: fromShort };

      const fromMap = parseProfileIdFromMapPath(asUrl.pathname, asUrl.search);
      if (fromMap) return { kind: "profile_id", profileId: fromMap };

      return null;
    }
  } catch {
    /* fall through to path parsing */
  }

  const pathOnly = trimmed.split(/[?#]/)[0] ?? trimmed;
  const query = trimmed.includes("?") ? trimmed.slice(trimmed.indexOf("?")) : "";

  const fromShort = parseShareCodeFromPath(pathOnly);
  if (fromShort) return { kind: "share_code", code: fromShort };

  const fromMap = parseProfileIdFromMapPath(pathOnly, query);
  if (fromMap) return { kind: "profile_id", profileId: fromMap };

  return null;
}

export function isZeipProfileUrl(href: string): boolean {
  return parseZeipProfileLink(href) !== null;
}
