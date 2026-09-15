import type { SupabaseClient } from "@supabase/supabase-js";
import {
  parseZeipProfileLink,
  PROFILE_SHARE_CODE_REGEX,
} from "@/lib/profileShare";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ModerationLookupResult = {
  found: boolean;
  profile_id?: string | null;
  auth_user_id?: string | null;
  full_name?: string | null;
  city?: string | null;
  role_title?: string | null;
  map_visible?: boolean | null;
  deleted_at?: string | null;
  is_blocked?: boolean | null;
  is_pro?: boolean | null;
  email?: string | null;
  email_banned?: boolean;
  is_admin?: boolean;
  counts?: Record<string, number>;
  error?: string;
};

export async function resolveModerationQueryToUid(
  adminSb: SupabaseClient,
  rawQuery: string,
): Promise<{ uid: string | null; error?: string }> {
  const query = rawQuery.trim();
  if (!query) {
    return { uid: null, error: "Пустой запрос" };
  }

  const linkRef = parseZeipProfileLink(query);
  if (linkRef?.kind === "profile_id") {
    return { uid: linkRef.profileId };
  }
  if (linkRef?.kind === "share_code") {
    const { data: profileId, error } = await adminSb.rpc(
      "resolve_profile_share_code",
      { p_code: linkRef.code },
    );
    if (error) {
      return { uid: null, error: error.message };
    }
    if (!profileId || typeof profileId !== "string") {
      return { uid: null, error: "Шортлинк не найден" };
    }
    return { uid: profileId };
  }

  if (UUID_RE.test(query)) {
    return { uid: query };
  }

  if (PROFILE_SHARE_CODE_REGEX.test(query)) {
    const { data: profileId, error } = await adminSb.rpc(
      "resolve_profile_share_code",
      { p_code: query },
    );
    if (error) {
      return { uid: null, error: error.message };
    }
    if (!profileId || typeof profileId !== "string") {
      return { uid: null, error: "Код профиля не найден" };
    }
    return { uid: profileId };
  }

  if (EMAIL_RE.test(query)) {
    const { data: authUserId, error } = await adminSb.rpc(
      "admin_lookup_auth_user_id_by_email",
      { p_email: query },
    );
    if (error) {
      return { uid: null, error: error.message };
    }
    if (!authUserId || typeof authUserId !== "string") {
      return { uid: null, error: "Пользователь с таким email не найден" };
    }
    return { uid: authUserId };
  }

  return {
    uid: null,
    error:
      "Не удалось распознать запрос. Вставьте ссылку /p/…, map?profile=…, UUID, код или email.",
  };
}

export async function lookupAccountForModeration(
  adminSb: SupabaseClient,
  rawQuery: string,
): Promise<ModerationLookupResult> {
  const { uid, error: resolveError } = await resolveModerationQueryToUid(
    adminSb,
    rawQuery,
  );
  if (resolveError) {
    return { found: false, error: resolveError };
  }
  if (!uid) {
    return { found: false, error: "Аккаунт не найден" };
  }

  const { data, error } = await adminSb.rpc("admin_lookup_account_for_purge", {
    p_uid: uid,
  });

  if (error) {
    return { found: false, error: error.message };
  }

  const row = data as ModerationLookupResult | null;
  if (!row?.found) {
    return { found: false, error: "Аккаунт не найден" };
  }

  return row;
}
