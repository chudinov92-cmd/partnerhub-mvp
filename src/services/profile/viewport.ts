"use client";

import { supabasePublic } from "@/lib/supabaseClient";
import type { FeedFilters, Profile, ProfileWorkBlock } from "@/types";
import { ONLINE_WINDOW_MS } from "@/app/map/constants";
import { RUSSIA_LABEL } from "@/data/cities";

export type MapBbox = {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
};

export type MapGridCluster = {
  cell_lat: number;
  cell_lng: number;
  point_count: number;
  has_pro: boolean;
};

export type MapLightPoint = {
  profile_id: string;
  lat: number;
  lng: number;
  subscription_plan: string;
  rating_count: number;
  plan_rank: number;
};

export type MapViewportPinRow = {
  location_id: string;
  user_id: string;
  lat: number;
  lng: number;
  city: string | null;
  profile: Profile;
};

export type MapViewportMode = "grid" | "cluster" | "street";

export const MAP_ZOOM_GRID_MAX = 8;
export const MAP_ZOOM_STREET_MIN = 13;
export const MAP_HTML_PIN_LIMIT = 200;
export const MAP_PRO_BREAKOUT_CAP = 30;
export const MAP_LIGHT_POINTS_LIMIT = 5000;

export type MapViewportFilterParams = {
  profession?: string | null;
  industry?: string | null;
  subindustry?: string | null;
  current_status?: string | null;
  age_from?: number | null;
  age_to?: number | null;
  online_after?: string | null;
  seeking?: string[] | null;
  interested_in_role?: string | null;
  contact_ids?: string[] | null;
  city?: string | null;
};

function normalizeWorkBlocks(raw: unknown): ProfileWorkBlock[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((block) => {
    const b = block as ProfileWorkBlock;
    return {
      id: b.id,
      role_title: b.role_title ?? null,
      industry: b.industry ?? null,
      subindustry: b.subindustry ?? null,
      experience_years: b.experience_years ?? null,
      sort_order: b.sort_order ?? 0,
    };
  });
}

function mapPinRow(row: {
  location_id: string;
  user_id: string;
  lat: number;
  lng: number;
  city: string | null;
  profile: unknown;
}): MapViewportPinRow {
  const prof = (row.profile ?? {}) as Profile & { work_blocks?: unknown };
  return {
    location_id: row.location_id,
    user_id: row.user_id,
    lat: row.lat,
    lng: row.lng,
    city: row.city ?? null,
    profile: {
      ...prof,
      work_blocks: normalizeWorkBlocks(prof.work_blocks),
    },
  };
}

export function feedFiltersToMapParams(
  filters: FeedFilters,
  options?: {
    contactsOnly?: boolean;
    contactProfileIds?: string[];
    selectedCity?: string;
    interestedInRole?: string | null;
  },
): MapViewportFilterParams {
  const onlineAfter =
    filters.online_status === "online"
      ? new Date(Date.now() - ONLINE_WINDOW_MS).toISOString()
      : filters.online_status === "offline"
        ? null
        : null;

  const offlineBefore =
    filters.online_status === "offline"
      ? new Date(Date.now() - ONLINE_WINDOW_MS).toISOString()
      : null;

  void offlineBefore;

  const city =
    options?.selectedCity && options.selectedCity !== RUSSIA_LABEL
      ? options.selectedCity
      : filters.recommendedContacts && options?.selectedCity !== RUSSIA_LABEL
        ? options?.selectedCity ?? null
        : null;

  return {
    profession: filters.profession,
    industry: filters.industry,
    subindustry: filters.subindustry,
    current_status: filters.current_status,
    age_from: filters.age_from,
    age_to: filters.age_to,
    online_after: onlineAfter,
    seeking: filters.seeking.length > 0 ? filters.seeking : null,
    interested_in_role:
      options?.interestedInRole ??
      (filters.recommendedContacts ? options?.interestedInRole ?? null : null),
    contact_ids:
      options?.contactsOnly && options.contactProfileIds?.length
        ? options.contactProfileIds
        : null,
    city: city ?? null,
  };
}

function rpcFilterArgs(params: MapViewportFilterParams) {
  return {
    p_profession: params.profession ?? undefined,
    p_industry: params.industry ?? undefined,
    p_subindustry: params.subindustry ?? undefined,
    p_current_status: params.current_status ?? undefined,
    p_age_from: params.age_from ?? undefined,
    p_age_to: params.age_to ?? undefined,
    p_online_after: params.online_after ?? undefined,
    p_seeking: params.seeking ?? undefined,
    p_interested_in_role: params.interested_in_role ?? undefined,
    p_contact_ids: params.contact_ids ?? undefined,
    p_city: params.city ?? undefined,
  };
}

export function expandBbox(bbox: MapBbox, paddingRatio = 0.1): MapBbox {
  const latPad = (bbox.maxLat - bbox.minLat) * paddingRatio;
  const lngPad = (bbox.maxLng - bbox.minLng) * paddingRatio;
  return {
    minLat: bbox.minLat - latPad,
    maxLat: bbox.maxLat + latPad,
    minLng: bbox.minLng - lngPad,
    maxLng: bbox.maxLng + lngPad,
  };
}

export function bboxFromLngLatBounds(
  sw: { lng: number; lat: number },
  ne: { lng: number; lat: number },
): MapBbox {
  return {
    minLat: Math.min(sw.lat, ne.lat),
    maxLat: Math.max(sw.lat, ne.lat),
    minLng: Math.min(sw.lng, ne.lng),
    maxLng: Math.max(sw.lng, ne.lng),
  };
}

export function getMapViewportMode(zoom: number): MapViewportMode {
  if (zoom <= MAP_ZOOM_GRID_MAX) return "grid";
  if (zoom >= MAP_ZOOM_STREET_MIN) return "street";
  return "cluster";
}

export async function fetchMapGridClusters(
  bbox: MapBbox,
  zoom: number,
  params: MapViewportFilterParams,
): Promise<MapGridCluster[]> {
  const { data, error } = await supabasePublic.rpc("fetch_map_grid_clusters", {
    p_min_lat: bbox.minLat,
    p_max_lat: bbox.maxLat,
    p_min_lng: bbox.minLng,
    p_max_lng: bbox.maxLng,
    p_zoom: Math.round(zoom),
    ...rpcFilterArgs(params),
  });
  if (error) throw error;
  return (data ?? []) as MapGridCluster[];
}

export async function fetchMapViewportPointsLight(
  bbox: MapBbox,
  params: MapViewportFilterParams,
  limit = MAP_LIGHT_POINTS_LIMIT,
): Promise<MapLightPoint[]> {
  const { data, error } = await supabasePublic.rpc(
    "fetch_map_viewport_points_light",
    {
      p_min_lat: bbox.minLat,
      p_max_lat: bbox.maxLat,
      p_min_lng: bbox.minLng,
      p_max_lng: bbox.maxLng,
      p_limit: limit,
      ...rpcFilterArgs(params),
    },
  );
  if (error) throw error;
  return (data ?? []) as MapLightPoint[];
}

export async function fetchMapViewportPins(
  bbox: MapBbox,
  options: {
    limit?: number;
    ownProfileId?: string | null;
    focusedProfileId?: string | null;
    paidOnly?: boolean;
    params: MapViewportFilterParams;
  },
): Promise<MapViewportPinRow[]> {
  const { data, error } = await supabasePublic.rpc("fetch_map_viewport_pins", {
    p_min_lat: bbox.minLat,
    p_max_lat: bbox.maxLat,
    p_min_lng: bbox.minLng,
    p_max_lng: bbox.maxLng,
    p_limit: options.limit ?? MAP_HTML_PIN_LIMIT,
    p_own: options.ownProfileId ?? undefined,
    p_focused: options.focusedProfileId ?? undefined,
    p_paid_only: options.paidOnly ?? false,
    ...rpcFilterArgs(options.params),
  });
  if (error) throw error;
  return ((data ?? []) as Parameters<typeof mapPinRow>[0][]).map(mapPinRow);
}

export async function fetchMapProfilesInterestedInViewport(
  roleTitle: string,
  bbox: MapBbox,
  options?: {
    excludeProfileId?: string;
    limit?: number;
    city?: string | null;
  },
): Promise<MapViewportPinRow[]> {
  const trimmed = roleTitle.trim();
  if (!trimmed) return [];

  const { data, error } = await supabasePublic.rpc(
    "fetch_map_profiles_interested_in",
    {
      p_role: trimmed,
      p_min_lat: bbox.minLat,
      p_max_lat: bbox.maxLat,
      p_min_lng: bbox.minLng,
      p_max_lng: bbox.maxLng,
      p_exclude: options?.excludeProfileId ?? undefined,
      p_limit: options?.limit ?? MAP_HTML_PIN_LIMIT,
      p_city: options?.city ?? undefined,
    },
  );
  if (error) throw error;
  return ((data ?? []) as Parameters<typeof mapPinRow>[0][]).map(mapPinRow);
}

export function pinRowsToProfiles(rows: MapViewportPinRow[]): Profile[] {
  return rows.map((r) => r.profile);
}

export function pinRowsToLocationPoints(rows: MapViewportPinRow[]) {
  return rows.map((r) => ({
    id: r.location_id,
    user_id: r.user_id,
    lat: r.lat,
    lng: r.lng,
    city: r.city,
  }));
}

export async function loadMapViewportData(opts: {
  bbox: MapBbox;
  zoom: number;
  params: MapViewportFilterParams;
  ownProfileId?: string | null;
  focusedProfileId?: string | null;
}) {
  const mode = getMapViewportMode(opts.zoom);
  const bbox = expandBbox(opts.bbox);

  const listPinParams = {
    params: opts.params,
    ownProfileId: opts.ownProfileId,
    focusedProfileId: opts.focusedProfileId,
    limit: MAP_HTML_PIN_LIMIT,
  };

  if (mode === "grid") {
    const [gridClusters, pinRows] = await Promise.all([
      fetchMapGridClusters(bbox, opts.zoom, opts.params),
      fetchMapViewportPins(bbox, listPinParams),
    ]);
    return {
      mode,
      gridClusters,
      lightPoints: [] as MapLightPoint[],
      pinRows,
    };
  }

  if (mode === "street") {
    const pinRows = await fetchMapViewportPins(bbox, listPinParams);
    return {
      mode,
      gridClusters: [] as MapGridCluster[],
      lightPoints: [] as MapLightPoint[],
      pinRows,
    };
  }

  const [lightPoints, pinRows] = await Promise.all([
    fetchMapViewportPointsLight(bbox, opts.params),
    fetchMapViewportPins(bbox, listPinParams),
  ]);

  return {
    mode,
    gridClusters: [] as MapGridCluster[],
    lightPoints,
    pinRows,
  };
}
