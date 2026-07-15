"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import mmrgl from "mmr-gl";
import "mmr-gl/dist/mmr-gl.css";
import type { LngLat } from "@/data/cityMapViews";
import { fetchActiveLocations, getProfessionMatchIndex } from "@/services/profileService";
import {
  isActiveProProfile,
  PRO_PIN_COLOR,
} from "@/services/subscriptionService";

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
const VK_MAP_STYLE = "mmr://api/styles/main_style.json";

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

export type PartnerMapProps = {
  onOpenChat?: (profileId: string) => void;
  onToggleContact?: (profileId: string) => void;
  onOpenProfile?: (profile: PartnerMapProps["profiles"][number]) => void;
  contactProfileIds?: string[];
  viewedProfileIds?: string[];
  focusedProfileId?: string | null;
  invalidateKey?: string;
  currentUserProfileId?: string | null;
  center?: LngLat;
  zoom?: number;
  professionFilter?: string | null;
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
  isPro: boolean;
  professionMatchIndex: number | null;
  zIndex: number;
};

export function PartnerMap({
  onOpenChat,
  onToggleContact,
  onOpenProfile,
  contactProfileIds,
  viewedProfileIds,
  focusedProfileId,
  invalidateKey,
  currentUserProfileId,
  profiles,
  center,
  zoom,
  professionFilter,
}: PartnerMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mmrgl.Map | null>(null);
  const markersRef = useRef<Map<string, mmrgl.Marker>>(new Map());
  const [points, setPoints] = useState<LocationPoint[]>([]);
  const [mapReady, setMapReady] = useState(false);

  const profileById = useMemo(() => {
    const map: Record<string, PartnerMapProps["profiles"][number]> = {};
    for (const p of profiles) {
      map[p.id] = p;
    }
    return map;
  }, [profiles]);

  const viewedSet = useMemo(() => new Set(viewedProfileIds ?? []), [viewedProfileIds]);

  const locationsFetchKey = `${invalidateKey ?? ""}|${profiles.length}|${currentUserProfileId ?? ""}`;

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const pts = await fetchActiveLocations(200);
      if (cancelled) return;
      setPoints(
        pts.map((row) => ({
          id: row.id,
          user_id: row.user_id,
          lat: row.lat,
          lng: row.lng,
          city: row.city ?? null,
        })),
      );
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [locationsFetchKey]);

  const effectiveCenter = toLngLat(center ?? PERM_CENTER);
  const effectiveZoom = zoom ?? DEFAULT_ZOOM;
  void onOpenChat;
  void onToggleContact;
  void contactProfileIds;

  const obfByUserId = useMemo(() => {
    const map = new Map<string, { lat: number; lng: number }>();
    for (const p of points) {
      map.set(
        p.user_id,
        obfuscateLatLngWithinRadius(p.lat, p.lng, p.user_id, GEO_PRIVACY_RADIUS_M),
      );
    }
    return map;
  }, [points]);

  const focusedTarget = useMemo(() => {
    if (!focusedProfileId) return null;
    return obfByUserId.get(focusedProfileId) ?? null;
  }, [focusedProfileId, obfByUserId]);

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
        const isPro = isActiveProProfile(profile);
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
          isPro,
          professionMatchIndex,
        };
      })
      .filter(Boolean) as Omit<MarkerRow, "zIndex">[];

    rows.sort((a, b) => {
      const f = Number(b.isFocused) - Number(a.isFocused);
      if (f !== 0) return f;

      if (professionFilter) {
        const aSlot = a.professionMatchIndex;
        const bSlot = b.professionMatchIndex;
        if (aSlot != null && bSlot != null && aSlot !== bSlot) {
          return aSlot - bSlot;
        }
      }

      const proRank = Number(b.isPro) - Number(a.isPro);
      if (proRank !== 0) return proRank;

      const v = Number(a.isViewed) - Number(b.isViewed);
      if (v !== 0) return v;

      const r = (b.rating ?? 0) - (a.rating ?? 0);
      if (r !== 0) return r;

      return a.profile.id.localeCompare(b.profile.id);
    });

    return rows.map((row, idx) => {
      const proBoost = row.isPro && !row.isOwn ? 500_000 : 0;
      const viewedBoost = row.isViewed ? 0 : 1_000_000;
      const focusedBoost = row.isFocused ? 2_000_000 : 0;
      const ownBoost = row.isOwn ? 100_000 : 0;
      const professionBoost =
        professionFilter && row.professionMatchIndex != null
          ? (10 - row.professionMatchIndex) * 300_000
          : 0;
      const zIndex =
        focusedBoost +
        professionBoost +
        proBoost +
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
      scrollZoom: false,
      attributionControl: false,
    });

    map.addControl(new mmrgl.NavigationControl({ showCompass: false }), "top-left");

    mapRef.current = map;

    const handleLoad = () => setMapReady(true);
    if (map.loaded()) {
      handleLoad();
    } else {
      map.once("load", handleLoad);
    }

    return () => {
      for (const marker of markersRef.current.values()) {
        marker.remove();
      }
      markersRef.current.clear();
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init once
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    map.jumpTo({ center: effectiveCenter, zoom: effectiveZoom });
    map.resize();
  }, [effectiveCenter, effectiveZoom, mapReady]);

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
    const map = mapRef.current;
    if (!map || !mapReady) return;

    for (const marker of markersRef.current.values()) {
      marker.remove();
    }
    markersRef.current.clear();

    for (const row of sortedPoints) {
      const obf = obfByUserId.get(row.pt.user_id) ?? {
        lat: row.pt.lat,
        lng: row.pt.lng,
      };
      const online = isOnline(row.profile.last_seen_at ?? null);
      const initial = pinInitial(row.profile.full_name);
      const pinFill = !row.isOwn && row.isPro ? PRO_PIN_COLOR : PIN_FILL_COLOR;
      const borderColor = row.isFocused
        ? PIN_FOCUSED_BORDER_COLOR
        : row.isViewed && !row.isOwn
          ? PIN_VIEWED_BORDER_COLOR
          : row.isOwn
            ? PIN_FILL_COLOR
            : PIN_BORDER_COLOR;

      const element = row.isOwn
        ? createPinElement(initial, PIN_BORDER_COLOR, borderColor, {
            letterColorHex: PIN_FILL_COLOR,
            stemHex: PIN_FILL_COLOR,
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
        onOpenProfile?.(row.profile);
      });

      const marker = new mmrgl.Marker({ element, anchor: "bottom" })
        .setLngLat([obf.lng, obf.lat])
        .addTo(map);

      markersRef.current.set(row.pt.id, marker);
    }
  }, [sortedPoints, obfByUserId, onOpenProfile, mapReady]);

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
