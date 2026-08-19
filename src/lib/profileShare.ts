export const PROFILE_SHARE_PREFIX = "__PROFILE_SHARE__";
export const PROFILE_MAP_QUERY_PARAM = "profile";

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
