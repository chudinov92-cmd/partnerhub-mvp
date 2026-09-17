"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import mmrgl from "mmr-gl";
import "mmr-gl/dist/mmr-gl.css";
import type { LngLat } from "@/data/cityMapViews";
import {
  getProfessionMatchIndex,
  MAP_ZOOM_STREET_MIN,
  type MapGridCluster,
  type MapLightPoint,
  type MapViewportMode,
} from "@/services/profileService";
import { comparePlanRank, getPinColorForPlan, planRank } from "@/lib/subscriptionPlans";
import { getEffectiveSubscriptionPlan } from "@/services/subscriptionService";

type LocationPoint = {
  id: string;
  user_id: string;
  lat: number;
  lng: number;
  city: string | null;
};

const PERM_CENTER: LngLat = [56.25, 58.01];
const DEFAULT_ZOOM = 12;
const GEO_PRIVACY_RADIUS_M = 250;
const PIN_FILL_COLOR = "#10B981";
const PIN_BORDER_COLOR = "#FFFFFF";
const PIN_VIEWED_BORDER_COLOR = "#9CA3AF";
const PIN_FOCUSED_BORDER_COLOR = "#F59E0B";
const Z_PIN_FOCUSED = 10_000_000;
const Z_PIN_OWN = 5_000_000;
const VK_MAP_STYLE = "mmr://api/styles/main_style.json";
const GRID_SOURCE_ID = "zeip-map-grid-clusters";
const GRID_LAYER_ID = "zeip-map-grid-circles";
const LIGHT_SOURCE_ID = "zeip-map-light-points";
const LIGHT_LAYER_ID = "zeip-map-light-circles";

function removeMapLayerAndSource(map: mmrgl.Map, layerId: string, sourceId: string) {
  if (map.getLayer(layerId)) map.removeLayer(layerId);
  if (map.getSource(sourceId)) map.removeSource(sourceId);
}

type MapGeoFeature = {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: Record<string, string | number | boolean>;
};

function upsertGeoJsonLayer(
  map: mmrgl.Map,
  sourceId: string,
  layerId: string,
  features: MapGeoFeature[],
  paint: Record<string, unknown>,
) {
  const data = { type: "FeatureCollection" as const, features };
  const source = map.getSource(sourceId) as mmrgl.GeoJSONSource | undefined;
  if (source) {
    source.setData(data);
    return;
  }
  map.addSource(sourceId, { type: "geojson", data });
  map.addLayer({
    id: layerId,
    type: "circle",
    source: sourceId,
    paint,
  });
}

function hashToSeed(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function obfuscateLatLngWithinRadius(
  lat: number,
  lng: number,
  seedStr: string,
  radiusM: number,
) {
  const seed = hashToSeed(seedStr);
  const rnd = mulberry32(seed);

  const u = rnd();
  const v = rnd();
  const r = radiusM * Math.sqrt(u);
  const theta = 2 * Math.PI * v;

  const R = 6378137;
  const latRad = (lat * Math.PI) / 180;

  const dNorth = r * Math.cos(theta);
  const dEast = r * Math.sin(theta);

  const dLat = dNorth / R;
  const dLng = dEast / (R * Math.cos(latRad));

  return {
    lat: lat + (dLat * 180) / Math.PI,
    lng: lng + (dLng * 180) / Math.PI,
  };
}

function escapeHtmlChar(char: string) {
  if (char === "&") return "&amp;";
  if (char === "<") return "&lt;";
  if (char === ">") return "&gt;";
  if (char === '"') return "&quot;";
  return char;
}

function pinInitial(fullName: string | null | undefined) {
  const c = fullName?.trim()?.[0];
  if (!c) return "?";
  return escapeHtmlChar(c.toLocaleUpperCase("ru-RU"));
}

function markerVisualKey(row: {
  isOwn: boolean;
  isViewed: boolean;
  isFocused: boolean;
  subscriptionPlan: string;
  initial: string;
}) {
  return `${row.isOwn}:${row.isFocused}:${row.isViewed}:${row.subscriptionPlan}:${row.initial}`;
}

function escapeHtmlColor(hex: string, fallback: string) {
  if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) return fallback;
  return hex;
}

function escapeHtmlText(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function toLngLat(center: LngLat | undefined): LngLat {
  if (!center || center.length < 2) return PERM_CENTER;
  return [Number(center[0]), Number(center[1])];
}

function createPinElement(
  letter: string,
  fillHex: string,
  borderColorHex: string,
  options?: { letterColorHex?: string; stemHex?: string },
): HTMLElement {
  const safeFill = escapeHtmlColor(fillHex, PIN_FILL_COLOR);
  const safeBorderColor = escapeHtmlColor(borderColorHex, PIN_BORDER_COLOR);
  const letterColorHex = options?.letterColorHex ?? "#FFFFFF";
  const safeLetterColor = escapeHtmlColor(letterColorHex, "#FFFFFF");
  const stemHex = options?.stemHex ?? fillHex;
  const safeStem = escapeHtmlColor(stemHex, safeFill);

  const root = document.createElement("div");
  root.className = "partner-map-marker-root";
  root.innerHTML = `<div class="partner-map-pin-wrap">
    <div class="partner-map-pin-head" style="background-color:${safeFill};border-color:${safeBorderColor}">
      <span class="partner-map-pin-letter" style="color:${safeLetterColor}">${letter}</span>
    </div>
    <div class="partner-map-pin-stem" style="background-color:${safeStem}"></div>
  </div>`;
  return root;
}

const PIN_HELLO_WRAP_CLASS = "partner-map-pin-wrap--hello";

function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function triggerOwnPinHello(
  wrap: HTMLElement,
  playedRef: { current: boolean },
) {
  if (playedRef.current || prefersReducedMotion()) {
    playedRef.current = true;
    return;
  }

  playedRef.current = true;
  wrap.classList.add(PIN_HELLO_WRAP_CLASS);

  const head = wrap.querySelector<HTMLElement>(".partner-map-pin-head");
  if (!head) {
    wrap.classList.remove(PIN_HELLO_WRAP_CLASS);
    return;
  }

  const onAnimationEnd = (event: AnimationEvent) => {
    if (event.target !== head) return;
    wrap.classList.remove(PIN_HELLO_WRAP_CLASS);
    head.removeEventListener("animationend", onAnimationEnd);
  };

  head.addEventListener("animationend", onAnimationEnd);
}

function scheduleOwnPinHello(
  map: mmrgl.Map,
  wrap: HTMLElement,
  playedRef: { current: boolean },
) {
  if (playedRef.current || prefersReducedMotion()) {
    playedRef.current = true;
    return;
  }

  const onIdle = () => {
    map.off("idle", onIdle);
    if (!wrap.isConnected || playedRef.current) return;
    triggerOwnPinHello(wrap, playedRef);
  };

  map.once("idle", onIdle);
  return () => {
    map.off("idle", onIdle);
  };
}

function setMarkerTooltip(
  root: HTMLElement,
  fullName: string,
  roleTitle: string | null | undefined,
  online: boolean,
) {
  let tooltip = root.querySelector<HTMLElement>(".partner-map-hover-tooltip");
  if (!tooltip) {
    tooltip = document.createElement("div");
    tooltip.className = "partner-map-hover-tooltip";
    root.appendChild(tooltip);
  }
  tooltip.innerHTML = `<div class="font-semibold">
    <span class="inline-flex items-center gap-2">
      <span>${escapeHtmlText(fullName)}</span>
      <span class="partner-map-online-dot ${online ? "is-online" : "is-offline"}" title="${online ? "Онлайн" : "Оффлайн"}"></span>
    </span>
  </div>${
    roleTitle
      ? `<div class="partner-map-tooltip-role">${escapeHtmlText(roleTitle)}</div>`
      : ""
  }`;
}

export type LightPointClickPayload = {
  lng: number;
  lat: number;
  zoomToStreet: () => void;
};

export type PartnerMapProps = {
  onOpenChat?: (profileId: string) => void;
  onToggleContact?: (profileId: string) => void;
  onOpenProfile?: (profile: PartnerMapProps["profiles"][number]) => void;
  onLightPointClick?: (payload: LightPointClickPayload) => void;
  contactProfileIds?: string[];
  viewedProfileIds?: string[];
  focusedProfileId?: string | null;
  invalidateKey?: string;
  /** Меняется при каждом «открытии» карты (вкладка map, remount). Сбрасывает hello-анимацию своего пина. */
  mapVisitKey?: string;
  currentUserProfileId?: string | null;
  currentUserReady?: boolean;
  ownLocationResolved?: boolean;
  center?: LngLat;
  zoom?: number;
  professionFilter?: string | null;
  locations?: LocationPoint[];
  lightPoints?: MapLightPoint[];
  gridClusters?: MapGridCluster[];
  viewportMode?: MapViewportMode;
  ownLocation?: LocationPoint | null;
  onViewportChange?: (
    sw: { lng: number; lat: number },
    ne: { lng: number; lat: number },
    zoom: number,
  ) => void;
  profiles: {
    id: string;
    full_name: string | null;
    city: string | null;
    industry?: string | null;
    subindustry?: string | null;
    role_title?: string | null;
    interested_in?: string | null;
    rating_count?: number | null;
    last_seen_at?: string | null;
    skills?: string | null;
    resources?: string | null;
    is_pro?: boolean | null;
    pro_expires_at?: string | null;
    subscription_plan?: "free" | "pro" | "pro_plus" | null;
    work_blocks?: {
      role_title: string | null;
      industry: string | null;
      subindustry: string | null;
      experience_years: number | null;
      sort_order?: number;
    }[];
  }[];
};

const ONLINE_WINDOW_MS = 2 * 60 * 1000;

function isOnline(lastSeenAt?: string | null) {
  if (!lastSeenAt) return false;
  const t = new Date(lastSeenAt).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t <= ONLINE_WINDOW_MS;
}

type MarkerRow = {
  pt: LocationPoint;
  profile: PartnerMapProps["profiles"][number];
  isOwn: boolean;
  isViewed: boolean;
  rating: number;
  isFocused: boolean;
  subscriptionPlan: "free" | "pro" | "pro_plus";
  professionMatchIndex: number | null;
  zIndex: number;
};

function PartnerMapInner({
  onOpenChat,
  onToggleContact,
  onOpenProfile,
  contactProfileIds,
  viewedProfileIds,
  focusedProfileId,
  invalidateKey,
  mapVisitKey = "map",
  currentUserProfileId,
  currentUserReady = true,
  ownLocationResolved = true,
  profiles,
  center,
  zoom,
  professionFilter,
  locations = [],
  lightPoints = [],
  gridClusters = [],
  viewportMode,
  ownLocation = null,
  onViewportChange,
  onLightPointClick,
}: PartnerMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mmrgl.Map | null>(null);
  const markersRef = useRef<Map<string, mmrgl.Marker>>(new Map());
  const markerMetaRef = useRef<Map<string, string>>(new Map());
  const ownPinMarkerRef = useRef<mmrgl.Marker | null>(null);
  const ownPinMetaRef = useRef<string | null>(null);
  const onOpenProfileRef = useRef(onOpenProfile);
  onOpenProfileRef.current = onOpenProfile;
  const onViewportChangeRef = useRef(onViewportChange);
  onViewportChangeRef.current = onViewportChange;
  const onLightPointClickRef = useRef(onLightPointClick);
  onLightPointClickRef.current = onLightPointClick;
  const ownPinWrapRef = useRef<HTMLElement | null>(null);
  const pinHelloPlayedRef = useRef(false);
  const ownPinCenteredRef = useRef(false);
  const lastCityViewRef = useRef<{ lng: number; lat: number; zoom: number } | null>(
    null,
  );
  const [mapReady, setMapReady] = useState(false);

  const points = locations;
  const showHtmlPins = viewportMode === "street" || viewportMode === undefined;
  const renderOwnPinSeparately = !showHtmlPins && ownLocation != null;

  const visibleLightPoints = useMemo(() => {
    if (!renderOwnPinSeparately || !currentUserProfileId) {
      return lightPoints;
    }
    return lightPoints.filter((pt) => pt.profile_id !== currentUserProfileId);
  }, [lightPoints, renderOwnPinSeparately, currentUserProfileId]);

  const profileById = useMemo(() => {
    const map: Record<string, PartnerMapProps["profiles"][number]> = {};
    for (const p of profiles) {
      map[p.id] = p;
    }
    return map;
  }, [profiles]);

  const viewedSet = useMemo(() => new Set(viewedProfileIds ?? []), [viewedProfileIds]);

  const effectiveCenter = useMemo(
    () => toLngLat(center ?? PERM_CENTER),
    [center?.[0], center?.[1]],
  );
  const effectiveZoom = zoom ?? DEFAULT_ZOOM;
  void onOpenChat;
  void onToggleContact;
  void contactProfileIds;

  const obfByUserId = useMemo(() => {
    const map = new Map<string, { lat: number; lng: number }>();
    const allPoints = ownLocation ? [...points, ownLocation] : points;
    for (const p of allPoints) {
      map.set(
        p.user_id,
        obfuscateLatLngWithinRadius(p.lat, p.lng, p.user_id, GEO_PRIVACY_RADIUS_M),
      );
    }
    return map;
  }, [points, ownLocation]);

  const focusedTarget = useMemo(() => {
    if (!focusedProfileId) return null;
    return obfByUserId.get(focusedProfileId) ?? null;
  }, [focusedProfileId, obfByUserId]);

  const ownPinTarget = useMemo(() => {
    if (!currentUserProfileId) return null;
    return obfByUserId.get(currentUserProfileId) ?? null;
  }, [currentUserProfileId, obfByUserId]);

  const sortedPoints = useMemo(() => {
    const ownId =
      currentUserProfileId != null && currentUserProfileId !== ""
        ? currentUserProfileId
        : null;

    const rows = points
      .map((pt) => {
        const profile = profileById[pt.user_id];
        if (!profile) return null;

        const isOwn = ownId != null && profile.id === ownId;
        const isViewed = !isOwn && viewedSet.has(profile.id);
        const rating = profile.rating_count ?? 0;
        const isFocused = focusedProfileId != null && focusedProfileId === profile.id;
        const subscriptionPlan = getEffectiveSubscriptionPlan(profile);
        const professionMatchIndex = professionFilter
          ? getProfessionMatchIndex(profile, professionFilter)
          : null;

        return {
          pt,
          profile,
          isOwn,
          isViewed,
          rating,
          isFocused,
          subscriptionPlan,
          professionMatchIndex,
        };
      })
      .filter(Boolean) as Omit<MarkerRow, "zIndex">[];

    rows.sort((a, b) => {
      const f = Number(b.isFocused) - Number(a.isFocused);
      if (f !== 0) return f;

      const own = Number(b.isOwn) - Number(a.isOwn);
      if (own !== 0) return own;

      if (professionFilter) {
        const aSlot = a.professionMatchIndex;
        const bSlot = b.professionMatchIndex;
        if (aSlot != null && bSlot != null && aSlot !== bSlot) {
          return aSlot - bSlot;
        }
      }

      // Pro+ → Pro → Free, внутри тарифа по rating_count по убыванию (как в SQL RPC).
      const tierRank = comparePlanRank(a.subscriptionPlan, b.subscriptionPlan);
      if (tierRank !== 0) return tierRank;

      const r = (b.rating ?? 0) - (a.rating ?? 0);
      if (r !== 0) return r;

      const v = Number(a.isViewed) - Number(b.isViewed);
      if (v !== 0) return v;

      return a.profile.id.localeCompare(b.profile.id);
    });

    return rows.map((row, idx) => {
      const tierBoost =
        !row.isOwn ? planRank(row.subscriptionPlan) * 250_000 : 0;
      const viewedBoost = row.isViewed ? 0 : 1_000_000;
      const focusedBoost = row.isFocused ? Z_PIN_FOCUSED : 0;
      const ownBoost = row.isOwn ? Z_PIN_OWN : 0;
      const professionBoost =
        professionFilter && row.professionMatchIndex != null
          ? (10 - row.professionMatchIndex) * 300_000
          : 0;
      const zIndex =
        focusedBoost +
        professionBoost +
        tierBoost +
        viewedBoost +
        ownBoost +
        (row.rating ?? 0) * 10 +
        (10_000 - idx);

      return { ...row, zIndex };
    });
  }, [
    points,
    profileById,
    viewedSet,
    focusedProfileId,
    currentUserProfileId,
    professionFilter,
  ]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const token = process.env.NEXT_PUBLIC_VK_MAPS_API_KEY?.trim();
    if (token) {
      mmrgl.accessToken = token;
    }

    const map = new mmrgl.Map({
      container: containerRef.current,
      style: VK_MAP_STYLE,
      center: effectiveCenter,
      zoom: effectiveZoom,
      scrollZoom: true,
      attributionControl: false,
    });

    map.addControl(new mmrgl.NavigationControl({ showCompass: false }), "top-left");

    mapRef.current = map;

    const emitViewport = () => {
      const bounds = map.getBounds();
      const sw = bounds.getSouthWest();
      const ne = bounds.getNorthEast();
      onViewportChangeRef.current?.(
        { lng: sw.lng, lat: sw.lat },
        { lng: ne.lng, lat: ne.lat },
        map.getZoom(),
      );
    };

    const handleLoad = () => {
      setMapReady(true);
      emitViewport();
    };

    map.on("moveend", emitViewport);
    map.on("zoomend", emitViewport);

    if (map.loaded()) {
      handleLoad();
    } else {
      map.once("load", handleLoad);
    }

    return () => {
      map.off("moveend", emitViewport);
      map.off("zoomend", emitViewport);
      ownPinMarkerRef.current?.remove();
      ownPinMarkerRef.current = null;
      for (const marker of markersRef.current.values()) {
        marker.remove();
      }
      markersRef.current.clear();
      removeMapLayerAndSource(map, GRID_LAYER_ID, GRID_SOURCE_ID);
      removeMapLayerAndSource(map, LIGHT_LAYER_ID, LIGHT_SOURCE_ID);
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init once
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const [lng, lat] = effectiveCenter;
    const prevCity = lastCityViewRef.current;
    const cityChanged =
      prevCity != null &&
      (prevCity.lng !== lng || prevCity.lat !== lat || prevCity.zoom !== effectiveZoom);

    lastCityViewRef.current = { lng, lat, zoom: effectiveZoom };

    if (cityChanged) {
      ownPinCenteredRef.current = true;
      map.jumpTo({ center: effectiveCenter, zoom: effectiveZoom });
    }

    map.resize();
  }, [effectiveCenter, effectiveZoom, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || ownPinCenteredRef.current) return;
    if (focusedProfileId) {
      ownPinCenteredRef.current = true;
      return;
    }
    if (!currentUserReady) return;
    if (currentUserProfileId && !ownPinTarget && !ownLocationResolved) {
      return;
    }

    if (ownPinTarget) {
      map.jumpTo({
        center: [ownPinTarget.lng, ownPinTarget.lat],
        zoom: effectiveZoom,
      });
    } else {
      map.jumpTo({ center: effectiveCenter, zoom: effectiveZoom });
    }

    ownPinCenteredRef.current = true;
    map.resize();
  }, [
    mapReady,
    currentUserReady,
    currentUserProfileId,
    ownPinTarget,
    ownLocationResolved,
    focusedProfileId,
    effectiveCenter,
    effectiveZoom,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const t = window.setTimeout(() => map.resize(), 0);
    return () => window.clearTimeout(t);
  }, [invalidateKey, mapReady, points.length, contactProfileIds?.length]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !focusedTarget) return;
    const nextZoom = Math.max(map.getZoom(), 13);
    map.flyTo({
      center: [focusedTarget.lng, focusedTarget.lat],
      zoom: nextZoom,
      duration: 600,
    });
  }, [focusedTarget, mapReady]);

  useEffect(() => {
    if (mapVisitKey === "map") {
      pinHelloPlayedRef.current = false;
    }
  }, [mapVisitKey]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    if (viewportMode === "grid" && gridClusters.length > 0) {
      removeMapLayerAndSource(map, LIGHT_LAYER_ID, LIGHT_SOURCE_ID);
      upsertGeoJsonLayer(
        map,
        GRID_SOURCE_ID,
        GRID_LAYER_ID,
        gridClusters.map((cell) => ({
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [cell.cell_lng, cell.cell_lat],
          },
          properties: {
            point_count: cell.point_count,
            has_pro: cell.has_pro ? 1 : 0,
          },
        })),
        {
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["get", "point_count"],
            1,
            10,
            50,
            18,
            500,
            28,
            5000,
            40,
          ],
          "circle-color": [
            "case",
            ["==", ["get", "has_pro"], 1],
            "#6466FA",
            "#10B981",
          ],
          "circle-opacity": 0.75,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      );
      return;
    }

    removeMapLayerAndSource(map, GRID_LAYER_ID, GRID_SOURCE_ID);

    if (viewportMode === "cluster" && visibleLightPoints.length > 0) {
      upsertGeoJsonLayer(
        map,
        LIGHT_SOURCE_ID,
        LIGHT_LAYER_ID,
        visibleLightPoints.map((pt) => ({
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [pt.lng, pt.lat],
          },
          properties: {
            plan_rank: pt.plan_rank,
          },
        })),
        {
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            9,
            7,
            11,
            9,
            12,
            11,
          ],
          "circle-color": [
            "match",
            ["get", "plan_rank"],
            3,
            "#6466FA",
            2,
            "#FDE047",
            "#10B981",
          ],
          "circle-opacity": 0.9,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      );
      return;
    }

    removeMapLayerAndSource(map, LIGHT_LAYER_ID, LIGHT_SOURCE_ID);
  }, [gridClusters, visibleLightPoints, mapReady, viewportMode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || viewportMode !== "cluster") return;
    if (!map.getLayer(LIGHT_LAYER_ID)) return;

    const onEnter = () => {
      map.getCanvas().style.cursor = "pointer";
    };
    const onLeave = () => {
      map.getCanvas().style.cursor = "";
    };
    const onClick = (event: mmrgl.MapMouseEvent & { defaultPrevented?: boolean }) => {
      const hits = map.queryRenderedFeatures(event.point, {
        layers: [LIGHT_LAYER_ID],
      });
      if (hits.length === 0) return;

      const { lng, lat } = event.lngLat;
      onLightPointClickRef.current?.({
        lng,
        lat,
        zoomToStreet: () => {
          map.easeTo({
            center: [lng, lat],
            zoom: MAP_ZOOM_STREET_MIN,
            duration: 500,
          });
        },
      });
    };

    map.on("mouseenter", LIGHT_LAYER_ID, onEnter);
    map.on("mouseleave", LIGHT_LAYER_ID, onLeave);
    map.on("click", LIGHT_LAYER_ID, onClick);

    return () => {
      map.off("mouseenter", LIGHT_LAYER_ID, onEnter);
      map.off("mouseleave", LIGHT_LAYER_ID, onLeave);
      map.off("click", LIGHT_LAYER_ID, onClick);
      map.getCanvas().style.cursor = "";
    };
  }, [mapReady, viewportMode, visibleLightPoints.length]);

  const ownPinRow = useMemo((): Omit<MarkerRow, "zIndex"> | null => {
    if (!renderOwnPinSeparately || !ownLocation || !currentUserProfileId) {
      return null;
    }
    const profile = profileById[currentUserProfileId];
    if (!profile) return null;

    return {
      pt: ownLocation,
      profile,
      isOwn: true,
      isViewed: false,
      rating: profile.rating_count ?? 0,
      isFocused: focusedProfileId === profile.id,
      subscriptionPlan: getEffectiveSubscriptionPlan(profile),
      professionMatchIndex: professionFilter
        ? getProfessionMatchIndex(profile, professionFilter)
        : null,
    };
  }, [
    renderOwnPinSeparately,
    ownLocation,
    currentUserProfileId,
    profileById,
    focusedProfileId,
    professionFilter,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    if (!renderOwnPinSeparately || !ownPinRow) {
      ownPinMarkerRef.current?.remove();
      ownPinMarkerRef.current = null;
      ownPinMetaRef.current = null;
      if (!showHtmlPins) {
        ownPinWrapRef.current = null;
      }
      return;
    }

    const row = { ...ownPinRow, zIndex: Z_PIN_OWN };
    const obf = obfByUserId.get(row.pt.user_id) ?? {
      lat: row.pt.lat,
      lng: row.pt.lng,
    };
    const online = isOnline(row.profile.last_seen_at ?? null);
    const initial = pinInitial(row.profile.full_name);
    const pinFill = getPinColorForPlan(row.subscriptionPlan);
    const borderColor = pinFill;
    const visualKey = markerVisualKey({
      isOwn: true,
      isViewed: false,
      isFocused: row.isFocused,
      subscriptionPlan: row.subscriptionPlan,
      initial,
    });

    const existing = ownPinMarkerRef.current;
    if (existing && ownPinMetaRef.current === visualKey) {
      existing.setLngLat([obf.lng, obf.lat]);
      const el = existing.getElement();
      el.style.zIndex = String(row.zIndex);
      setMarkerTooltip(
        el,
        row.profile.full_name || "Специалист",
        row.profile.role_title,
        online,
      );
      const wrap = el.querySelector<HTMLElement>(".partner-map-pin-wrap");
      if (wrap) ownPinWrapRef.current = wrap;
      return;
    }

    existing?.remove();

    const element = createPinElement(initial, PIN_BORDER_COLOR, borderColor, {
      letterColorHex: pinFill,
      stemHex: pinFill,
    });
    element.style.zIndex = String(row.zIndex);
    setMarkerTooltip(
      element,
      row.profile.full_name || "Специалист",
      row.profile.role_title,
      online,
    );
    element.addEventListener("click", (event) => {
      event.stopPropagation();
      onOpenProfileRef.current?.(row.profile);
    });

    const wrap = element.querySelector<HTMLElement>(".partner-map-pin-wrap");
    if (wrap) ownPinWrapRef.current = wrap;

    ownPinMarkerRef.current = new mmrgl.Marker({ element, anchor: "bottom" })
      .setLngLat([obf.lng, obf.lat])
      .addTo(map);
    ownPinMetaRef.current = visualKey;
  }, [ownPinRow, obfByUserId, mapReady, renderOwnPinSeparately, showHtmlPins]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    if (!showHtmlPins) {
      for (const marker of markersRef.current.values()) {
        marker.remove();
      }
      markersRef.current.clear();
      markerMetaRef.current.clear();
      return;
    }

    ownPinWrapRef.current = null;

    const nextIds = new Set(sortedPoints.map((row) => row.pt.id));

    for (const [id, marker] of markersRef.current.entries()) {
      if (!nextIds.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
        markerMetaRef.current.delete(id);
      }
    }

    for (const row of sortedPoints) {
      const obf = obfByUserId.get(row.pt.user_id) ?? {
        lat: row.pt.lat,
        lng: row.pt.lng,
      };
      const online = isOnline(row.profile.last_seen_at ?? null);
      const initial = pinInitial(row.profile.full_name);
      const pinFill = getPinColorForPlan(row.subscriptionPlan);
      const borderColor = row.isFocused
        ? PIN_FOCUSED_BORDER_COLOR
        : row.isViewed && !row.isOwn
          ? PIN_VIEWED_BORDER_COLOR
          : row.isOwn
            ? pinFill
            : PIN_BORDER_COLOR;

      const visualKey = markerVisualKey({
        isOwn: row.isOwn,
        isViewed: row.isViewed,
        isFocused: row.isFocused,
        subscriptionPlan: row.subscriptionPlan,
        initial,
      });

      const existing = markersRef.current.get(row.pt.id);
      const prevKey = markerMetaRef.current.get(row.pt.id);

      if (existing && prevKey === visualKey) {
        existing.setLngLat([obf.lng, obf.lat]);
        const el = existing.getElement();
        el.style.zIndex = String(row.zIndex);
        setMarkerTooltip(
          el,
          row.profile.full_name || "Специалист",
          row.profile.role_title,
          online,
        );
        if (row.isOwn) {
          const wrap = el.querySelector<HTMLElement>(".partner-map-pin-wrap");
          if (wrap) ownPinWrapRef.current = wrap;
        }
        continue;
      }

      if (existing) {
        existing.remove();
        markersRef.current.delete(row.pt.id);
      }

      const element = row.isOwn
        ? createPinElement(initial, PIN_BORDER_COLOR, borderColor, {
            letterColorHex: pinFill,
            stemHex: pinFill,
          })
        : createPinElement(initial, pinFill, borderColor);

      element.style.zIndex = String(row.zIndex);
      setMarkerTooltip(
        element,
        row.profile.full_name || "Специалист",
        row.profile.role_title,
        online,
      );

      element.addEventListener("click", (event) => {
        event.stopPropagation();
        onOpenProfileRef.current?.(row.profile);
      });

      if (row.isOwn) {
        const wrap = element.querySelector<HTMLElement>(".partner-map-pin-wrap");
        if (wrap) ownPinWrapRef.current = wrap;
      }

      const marker = new mmrgl.Marker({ element, anchor: "bottom" })
        .setLngLat([obf.lng, obf.lat])
        .addTo(map);

      markersRef.current.set(row.pt.id, marker);
      markerMetaRef.current.set(row.pt.id, visualKey);
    }
  }, [sortedPoints, obfByUserId, mapReady, showHtmlPins]);

  useEffect(() => {
    if (mapVisitKey !== "map" || !mapReady) return;
    const map = mapRef.current;
    const wrap = ownPinWrapRef.current;
    if (!map || !wrap?.isConnected || pinHelloPlayedRef.current) return;
    return scheduleOwnPinHello(map, wrap, pinHelloPlayedRef);
  }, [mapVisitKey, mapReady, sortedPoints, ownPinRow, currentUserProfileId]);

  return (
    <div className="relative isolate h-full min-h-0 w-full overflow-hidden border border-slate-200 bg-slate-100 shadow-sm">
      <div
        ref={containerRef}
        className="zeip-partner-map mmrgl-map h-full w-full"
      />
      {!process.env.NEXT_PUBLIC_VK_MAPS_API_KEY && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-100/80 p-4 text-center text-sm text-slate-600">
          Не задан NEXT_PUBLIC_VK_MAPS_API_KEY
        </div>
      )}
    </div>
  );
}

function profilesStableKey(profiles: PartnerMapProps["profiles"]) {
  return profiles
    .map(
      (p) =>
        `${p.id}:${p.last_seen_at ?? ""}:${p.subscription_plan ?? "free"}:${p.rating_count ?? 0}`,
    )
    .join("|");
}

function arrayStableKey(arr: string[] | undefined) {
  return (arr ?? []).join(",");
}

function locationsStableKey(locations: LocationPoint[] | undefined) {
  return (locations ?? [])
    .map((p) => `${p.id}:${p.user_id}:${p.lat}:${p.lng}`)
    .join("|");
}

function gridClustersStableKey(clusters: MapGridCluster[] | undefined) {
  return (clusters ?? [])
    .map((c) => `${c.cell_lat}:${c.cell_lng}:${c.point_count}:${c.has_pro}`)
    .join("|");
}

function lightPointsStableKey(points: MapLightPoint[] | undefined) {
  return (points ?? [])
    .map((p) => `${p.profile_id}:${p.lat}:${p.lng}:${p.plan_rank}`)
    .join("|");
}

export const PartnerMap = memo(PartnerMapInner, (prev, next) => {
  return (
    prev.focusedProfileId === next.focusedProfileId &&
    prev.currentUserProfileId === next.currentUserProfileId &&
    prev.currentUserReady === next.currentUserReady &&
    prev.ownLocationResolved === next.ownLocationResolved &&
    prev.professionFilter === next.professionFilter &&
    prev.invalidateKey === next.invalidateKey &&
    prev.center?.[0] === next.center?.[0] &&
    prev.center?.[1] === next.center?.[1] &&
    prev.zoom === next.zoom &&
    prev.mapVisitKey === next.mapVisitKey &&
    prev.viewportMode === next.viewportMode &&
    prev.onViewportChange === next.onViewportChange &&
    prev.onLightPointClick === next.onLightPointClick &&
    locationsStableKey(prev.ownLocation ? [prev.ownLocation] : []) ===
      locationsStableKey(next.ownLocation ? [next.ownLocation] : []) &&
    profilesStableKey(prev.profiles) === profilesStableKey(next.profiles) &&
    locationsStableKey(prev.locations) === locationsStableKey(next.locations) &&
    gridClustersStableKey(prev.gridClusters) ===
      gridClustersStableKey(next.gridClusters) &&
    lightPointsStableKey(prev.lightPoints) ===
      lightPointsStableKey(next.lightPoints) &&
    arrayStableKey(prev.viewedProfileIds) ===
      arrayStableKey(next.viewedProfileIds) &&
    arrayStableKey(prev.contactProfileIds) ===
      arrayStableKey(next.contactProfileIds)
  );
});
