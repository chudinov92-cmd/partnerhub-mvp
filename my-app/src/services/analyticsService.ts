"use client";

import type { FeedFilters } from "@my-startup/profile";

export type MapSearchEventPayload = {
  target_profession: string;
  city_context: string;
  filters_json?: Partial<FeedFilters> | null;
};

const DAILY_PING_STORAGE_PREFIX = "zeip_daily_ping_utc:";

/** Best-effort: фиксирует активность пользователя за текущий день (UTC). */
export async function logDailyActivity(): Promise<void> {
  try {
    if (typeof window !== "undefined") {
      const dayKey = `${DAILY_PING_STORAGE_PREFIX}${new Date().toISOString().slice(0, 10)}`;
      if (sessionStorage.getItem(dayKey)) return;
    }

    const res = await fetch("/api/analytics/daily-ping", {
      method: "POST",
      keepalive: true,
    });

    if (typeof window !== "undefined" && res.ok) {
      const dayKey = `${DAILY_PING_STORAGE_PREFIX}${new Date().toISOString().slice(0, 10)}`;
      sessionStorage.setItem(dayKey, "1");
    }
  } catch {
    // analytics must not break UX
  }
}

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
