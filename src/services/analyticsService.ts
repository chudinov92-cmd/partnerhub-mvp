"use client";

import type { FeedFilters } from "@/types";

export type MapSearchEventPayload = {
  target_profession: string;
  city_context: string;
  filters_json?: Partial<FeedFilters> | null;
};

/** Логирует нажатие «Поиск» на карте (только если выбрана profession). Best-effort. */
export async function logMapSearchEvent(
  payload: MapSearchEventPayload,
): Promise<void> {
  const profession = payload.target_profession?.trim();
  if (!profession) return;

  try {
    await fetch("/api/analytics/map-search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        target_profession: profession,
        city_context: payload.city_context,
        filters_json: payload.filters_json ?? null,
      }),
      keepalive: true,
    });
  } catch {
    // analytics must not break UX
  }
}

export type DemandMatrixRow = {
  seeker_role: string;
  target_profession: string;
  user_count?: number;
  event_count?: number;
};

export type ProfileDemandQuery = {
  city?: string | null;
  country?: string | null;
  age_from?: number | null;
  age_to?: number | null;
  is_pro?: boolean | null;
  active_only?: boolean;
  active_from?: string | null;
  active_to?: string | null;
};

export type MapSearchDemandQuery = {
  from: string;
  to: string;
  city_context?: string | null;
  country?: string | null;
  age_from?: number | null;
  age_to?: number | null;
  is_pro?: boolean | null;
  auth_filter?: "all" | "authed" | "guest";
};

function buildQuery(params: Record<string, string | undefined>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== "") q.set(k, v);
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}

export async function fetchProfileDemandMatrix(
  query: ProfileDemandQuery,
): Promise<DemandMatrixRow[]> {
  const qs = buildQuery({
    city: query.city ?? undefined,
    country: query.country ?? undefined,
    age_from: query.age_from != null ? String(query.age_from) : undefined,
    age_to: query.age_to != null ? String(query.age_to) : undefined,
    is_pro:
      query.is_pro === true
        ? "true"
        : query.is_pro === false
          ? "false"
          : undefined,
    active_only: query.active_only ? "true" : undefined,
    active_from: query.active_from ?? undefined,
    active_to: query.active_to ?? undefined,
  });
  const res = await fetch(`/api/admin/analytics/profile-demand${qs}`);
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "Не удалось загрузить спрос из профилей");
  }
  const data = (await res.json()) as { rows?: DemandMatrixRow[] };
  return data.rows ?? [];
}

export async function fetchMapSearchMatrix(
  query: MapSearchDemandQuery,
): Promise<DemandMatrixRow[]> {
  const qs = buildQuery({
    from: query.from,
    to: query.to,
    city_context: query.city_context ?? undefined,
    country: query.country ?? undefined,
    age_from: query.age_from != null ? String(query.age_from) : undefined,
    age_to: query.age_to != null ? String(query.age_to) : undefined,
    is_pro:
      query.is_pro === true
        ? "true"
        : query.is_pro === false
          ? "false"
          : undefined,
    auth_filter: query.auth_filter ?? "all",
  });
  const res = await fetch(`/api/admin/analytics/map-search${qs}`);
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "Не удалось загрузить поиски на карте");
  }
  const data = (await res.json()) as { rows?: DemandMatrixRow[] };
  return data.rows ?? [];
}
