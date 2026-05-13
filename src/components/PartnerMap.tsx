"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  MapContainer,
  TileLayer,
  Marker,
  Tooltip,
  useMap,
} from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import { fetchActiveLocations } from "@/services/profileService";

type LocationPoint = {
  id: string;
  user_id: string;
  lat: number;
  lng: number;
  city: string | null;
};

const PERM_CENTER: LatLngExpression = [58.01, 56.25];
const DEFAULT_ZOOM = 12;
const GEO_PRIVACY_RADIUS_M = 250;
/** Единая заливка всех пинов на карте */
const PIN_FILL_COLOR = "#10B981";
/** Обводка пина по умолчанию */
const PIN_BORDER_COLOR = "#FFFFFF";
/** Просмотренные профили: делаем обводку серой */
const PIN_VIEWED_BORDER_COLOR = "#9CA3AF";
/** Выбранный профиль (после "Показать на карте") */
const PIN_FOCUSED_BORDER_COLOR = "#F59E0B";

function hashToSeed(str: string) {
  // Deterministic 32-bit hash for stable obfuscation.
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
  // Random point inside a disk with deterministic seed.
  // Uses an equirectangular approximation which is accurate enough for <= a few km.
  const seed = hashToSeed(seedStr);
  const rnd = mulberry32(seed);

  const u = rnd(); // [0,1)
  const v = rnd(); // [0,1)
  const r = radiusM * Math.sqrt(u);
  const theta = 2 * Math.PI * v;

  const R = 6378137; // meters (WGS84)
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

const PIN_ICON_SIZE: [number, number] = [48, 60];
const PIN_ICON_ANCHOR: [number, number] = [24, 60];
const PIN_POPUP_ANCHOR: [number, number] = [0, -56];

function getOrCreatePinIcon(cache: Map<string, L.DivIcon>, letter: string) {
  const safeColor = escapeHtmlColor(PIN_FILL_COLOR, PIN_FILL_COLOR);
  let icon = cache.get(letter);
  if (!icon) {
    icon = L.divIcon({
      className: "partner-map-div-icon",
      html: `<div class="partner-map-pin-wrap">
        <div class="partner-map-pin-head" style="background-color:${safeColor}">
          <span class="partner-map-pin-letter">${letter}</span>
        </div>
        <div class="partner-map-pin-stem" style="background-color:${safeColor}"></div>
      </div>`,
      iconSize: PIN_ICON_SIZE,
      iconAnchor: PIN_ICON_ANCHOR,
      popupAnchor: PIN_POPUP_ANCHOR,
    });
    cache.set(letter, icon);
  }
  return icon;
}

function getOrCreatePinIconColored(
  cache: Map<string, L.DivIcon>,
  letter: string,
  fillHex: string,
  borderColorHex: string,
  options?: { letterColorHex?: string; stemHex?: string },
) {
  const safeFill = escapeHtmlColor(fillHex, PIN_FILL_COLOR);
  const safeBorderColor = escapeHtmlColor(borderColorHex, PIN_BORDER_COLOR);
  const letterColorHex = options?.letterColorHex ?? "#FFFFFF";
  const safeLetterColor = escapeHtmlColor(letterColorHex, "#FFFFFF");
  const stemHex = options?.stemHex ?? fillHex;
  const safeStem = escapeHtmlColor(stemHex, safeFill);
  const key = `${letter}::${safeFill}::${safeBorderColor}::${safeLetterColor}::${safeStem}`;
  let icon = cache.get(key);
  if (!icon) {
    icon = L.divIcon({
      className: "partner-map-div-icon",
      html: `<div class="partner-map-pin-wrap">
        <div class="partner-map-pin-head" style="background-color:${safeFill};border-color:${safeBorderColor}">
          <span class="partner-map-pin-letter" style="color:${safeLetterColor}">${letter}</span>
        </div>
        <div class="partner-map-pin-stem" style="background-color:${safeStem}"></div>
      </div>`,
      iconSize: PIN_ICON_SIZE,
      iconAnchor: PIN_ICON_ANCHOR,
      popupAnchor: PIN_POPUP_ANCHOR,
    });
    cache.set(key, icon);
  }
  return icon;
}

export type PartnerMapProps = {
  onOpenChat?: (profileId: string) => void;
  onToggleContact?: (profileId: string) => void;
  onOpenProfile?: (profile: PartnerMapProps["profiles"][number]) => void;
  contactProfileIds?: string[];
  viewedProfileIds?: string[];
  /** Если задано — перелететь к пину и выделить его */
  focusedProfileId?: string | null;
  /** Меняйте значение при show/hide контейнера карты (моб. табы и т.п.) */
  invalidateKey?: string;
  /** Пин текущего пользователя (белая заливка, зелёная обводка и буква) */
  currentUserProfileId?: string | null;
  center?: LatLngExpression;
  zoom?: number;
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
  }[];
};

const ONLINE_WINDOW_MS = 2 * 60 * 1000;

function isOnline(lastSeenAt?: string | null) {
  if (!lastSeenAt) return false;
  const t = new Date(lastSeenAt).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t <= ONLINE_WINDOW_MS;
}

function MapView({ center, zoom }: { center: LatLngExpression; zoom: number }) {
  const map = useMap();

  useEffect(() => {
    map.setView(center, zoom);
    // После смены видимости контейнера (таб/accordion/пересчёт layout)
    // Leaflet иногда не обновляет размеры сам.
    map.invalidateSize();
  }, [center, zoom, map]);

  return null;
}

function MapSizeInvalidator({ invalidateKey }: { invalidateKey: string }) {
  const map = useMap();

  useEffect(() => {
    const t = window.setTimeout(() => {
      map.invalidateSize();
    }, 0);
    return () => window.clearTimeout(t);
  }, [invalidateKey, map]);

  return null;
}

function FocusOnTarget({
  target,
}: {
  target: { lat: number; lng: number } | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (!target) return;
    const current = map.getZoom();
    const nextZoom = Math.max(current, 13);
    map.flyTo([target.lat, target.lng], nextZoom, { duration: 0.6 });
  }, [target, map]);

  return null;
}

// Leaflet Popup якорится к координатам маркера, поэтому поп-ап
// визуально "привязан". Для требований "в центре экрана" используем
// отдельный React-overlay (см. рендер ниже).

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
}: PartnerMapProps) {
  const [points, setPoints] = useState<LocationPoint[]>([]);
  const pinIconCacheRef = useRef(new Map<string, L.DivIcon>());

  const profileById = useMemo(() => {
    const map: Record<string, PartnerMapProps["profiles"][number]> = {};
    for (const p of profiles) {
      map[p.id] = p;
    }
    return map;
  }, [profiles]);

  const viewedSet = useMemo(() => {
    return new Set(viewedProfileIds ?? []);
  }, [viewedProfileIds]);

  useEffect(() => {
    const load = async () => {
      const pts = await fetchActiveLocations(200);
      const normalized: LocationPoint[] = pts.map((row) => ({
        id: row.id,
        user_id: row.user_id,
        lat: row.lat,
        lng: row.lng,
        city: row.city ?? null,
      }));
      setPoints(normalized);
    };

    load();
  }, []);

  const effectiveCenter = center ?? PERM_CENTER;
  const effectiveZoom = zoom ?? DEFAULT_ZOOM;
  void onOpenChat;
  void onToggleContact;
  void contactProfileIds;
  void focusedProfileId;
  void invalidateKey;

  const obfByUserId = useMemo(() => {
    const map = new Map<string, { lat: number; lng: number }>();
    for (const p of points) {
      map.set(
        p.user_id,
        obfuscateLatLngWithinRadius(
          p.lat,
          p.lng,
          p.user_id,
          GEO_PRIVACY_RADIUS_M,
        ),
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
        // Свой пин не "опускаем" вниз, даже если id вдруг есть в viewedProfileIds.
        const isViewed = !isOwn && viewedSet.has(profile.id);
        const rating = profile.rating_count ?? 0;
        const isFocused =
          focusedProfileId != null && focusedProfileId === profile.id;

        return {
          pt,
          profile,
          isOwn,
          isViewed,
          rating,
          isFocused,
        };
      })
      .filter(Boolean) as {
      pt: LocationPoint;
      profile: PartnerMapProps["profiles"][number];
      isOwn: boolean;
      isViewed: boolean;
      rating: number;
      isFocused: boolean;
    }[];

    rows.sort((a, b) => {
      // Фокусированный всегда выше остальных.
      const f = Number(b.isFocused) - Number(a.isFocused);
      if (f !== 0) return f;

      // Непросмотренные выше просмотренных.
      const v = Number(a.isViewed) - Number(b.isViewed); // false(0) first
      if (v !== 0) return v;

      // По рейтингу: больше — выше.
      const r = (b.rating ?? 0) - (a.rating ?? 0);
      if (r !== 0) return r;

      // Стабильный тайбрейк.
      return a.profile.id.localeCompare(b.profile.id);
    });

    return rows;
  }, [points, profileById, viewedSet, focusedProfileId, currentUserProfileId]);

  return (
    <div className="h-full min-h-0 w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm">
      <MapContainer
        className="zeip-partner-map"
        center={effectiveCenter}
        zoom={effectiveZoom}
        scrollWheelZoom={false}
        attributionControl={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapView center={effectiveCenter} zoom={effectiveZoom} />
        <FocusOnTarget target={focusedTarget} />
        <MapSizeInvalidator
          invalidateKey={`${invalidateKey ?? ""}-${effectiveZoom}-${String(
            effectiveCenter,
          )}-${points.length}-${(contactProfileIds ?? []).length}`}
        />

        {sortedPoints.map(({ pt: p, profile, isOwn, isViewed, rating, isFocused }, idx) => {
          const online = isOnline(profile?.last_seen_at ?? null);
          const initial = pinInitial(profile?.full_name);

          const borderColor = isFocused
            ? PIN_FOCUSED_BORDER_COLOR
            : isViewed && !isOwn
              ? PIN_VIEWED_BORDER_COLOR
              : isOwn
                ? PIN_FILL_COLOR
                : PIN_BORDER_COLOR;

          const pinIcon = isOwn
            ? getOrCreatePinIconColored(
                pinIconCacheRef.current,
                initial,
                PIN_BORDER_COLOR,
                borderColor,
                {
                  letterColorHex: PIN_FILL_COLOR,
                  stemHex: PIN_FILL_COLOR,
                },
              )
            : getOrCreatePinIconColored(
                pinIconCacheRef.current,
                initial,
                PIN_FILL_COLOR,
                borderColor,
              );
          const obf = obfByUserId.get(p.user_id) ?? {
            lat: p.lat,
            lng: p.lng,
          };

          // Leaflet использует zIndexOffset для "слоёв" маркеров.
          // Чем больше — тем выше отрисовка.
          const viewedBoost = isViewed ? 0 : 1_000_000;
          const focusedBoost = isFocused ? 2_000_000 : 0;
          const ownBoost = isOwn ? 100_000 : 0;
          const zIndexOffset =
            focusedBoost + viewedBoost + ownBoost + (rating ?? 0) * 10 + (10_000 - idx);

          return (
            <Marker
              key={p.id}
              position={[obf.lat, obf.lng]}
              icon={pinIcon}
              zIndexOffset={zIndexOffset}
              eventHandlers={{
                click: () => onOpenProfile?.(profile),
              }}
            >
              <Tooltip direction="top" offset={[0, -52]} opacity={1}>
                <div className="text-xs">
                  <div className="font-semibold">
                    <span className="inline-flex items-center gap-2">
                      <span>{profile?.full_name || "Специалист"}</span>
                      <span
                        className={`h-2 w-2 rounded-full ${
                          online ? "bg-emerald-500" : "bg-slate-400"
                        }`}
                        title={online ? "Онлайн" : "Оффлайн"}
                      />
                    </span>
                  </div>
                  {profile?.role_title && (
                    <div className="text-slate-500">{profile.role_title}</div>
                  )}
                </div>
              </Tooltip>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}

