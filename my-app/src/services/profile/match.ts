"use client";

import type { Profile } from "@/types";

export function getProfessionMatchIndex(
  profile: Pick<Profile, "role_title" | "work_blocks">,
  profession: string,
): number | null {
  const target = profession.trim();
  if (!target) return null;

  if ((profile.role_title ?? "").trim() === target) return 0;

  const extras = profile.work_blocks ?? [];
  for (let i = 0; i < extras.length; i++) {
    if ((extras[i].role_title ?? "").trim() === target) return i + 1;
  }
  return null;
}

export function profileMatchesProfession(
  profile: Pick<Profile, "role_title" | "work_blocks">,
  profession: string,
): boolean {
  return getProfessionMatchIndex(profile, profession) !== null;
}

export function parseInterestedProfessions(raw: string | null | undefined) {
  if (!raw) return [];
  return raw
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter(Boolean);
}

const MAX_INTERESTED_PROFESSIONS = 5;

export function serializeInterestedProfessions(values: string[]): string | null {
  const unique = new Set<string>();
  const normalized: string[] = [];
  for (const raw of values) {
    const value = (raw ?? "").trim();
    if (!value || unique.has(value)) continue;
    unique.add(value);
    normalized.push(value);
    if (normalized.length >= MAX_INTERESTED_PROFESSIONS) break;
  }
  return normalized.length > 0 ? normalized.join("\n") : null;
}

export function profileInterestedInProfession(
  profile: Pick<Profile, "interested_in">,
  profession: string,
) {
  const target = profession.trim();
  if (!target) return false;
  return parseInterestedProfessions(profile.interested_in).includes(target);
}
