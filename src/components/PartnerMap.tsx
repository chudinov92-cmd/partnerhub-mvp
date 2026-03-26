"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Tooltip,
  Popup,
  useMap,
} from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import { supabase } from "@/lib/supabaseClient";

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

function getMarkerColorByProfession(profession?: string | null) {
  const p = (profession ?? "").toLowerCase();
  if (!p) return "#0ea5e9";
  if (p.includes("программист") || p.includes("инженер")) return "#3b82f6";
  if (p.includes("юрист") || p.includes("бухгалтер") || p.includes("экономист"))
    return "#a855f7";
  if (p.includes("дизайнер")) return "#22c55e";
  if (p.includes("менеджер") || p.includes("маркет")) return "#22c55e";
  return "#0ea5e9";
}

export type PartnerMapProps = {
  onOpenChat?: (profileId: string) => void;
  onToggleContact?: (profileId: string) => void;
  contactProfileIds?: string[];
  center?: LatLngExpression;
  zoom?: number;
  profiles: {
    id: string;
    full_name: string | null;
    city: string | null;
    industry?: string | null;
    subindustry?: string | null;
    role_title?: string | null;
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
  }, [center, zoom, map]);

  return null;
}

export function PartnerMap({
  onOpenChat,
  onToggleContact,
  contactProfileIds,
  profiles,
  center,
  zoom,
}: PartnerMapProps) {
  const [points, setPoints] = useState<LocationPoint[]>([]);

  const profileById = useMemo(() => {
    const map: Record<string, PartnerMapProps["profiles"][number]> = {};
    for (const p of profiles) {
      map[p.id] = p;
    }
    return map;
  }, [profiles]);

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from("locations")
        .select("id, user_id, lat, lng, city")
        .eq("is_active", true)
        .limit(200);

      if (!error && data) {
        const normalized: LocationPoint[] = (data as any[]).map((row) => ({
          id: row.id,
          user_id: row.user_id,
          lat: row.lat,
          lng: row.lng,
          city: row.city ?? null,
        }));

        setPoints(normalized);
      }
    };

    load();
  }, []);

  const effectiveCenter = center ?? PERM_CENTER;
  const effectiveZoom = zoom ?? DEFAULT_ZOOM;
  const contactSet = useMemo(
    () => new Set(contactProfileIds ?? []),
    [contactProfileIds],
  );

  return (
    <div className="h-full min-h-[420px] w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm">
      <MapContainer
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

        {points.map((p) => {
          const profile = profileById[p.user_id];
          if (!profile) return null;
          const color = getMarkerColorByProfession(profile?.role_title);
          const online = isOnline(profile?.last_seen_at ?? null);
          const obf = obfuscateLatLngWithinRadius(
            p.lat,
            p.lng,
            // Seed by user_id so the pin stays stable for the same user.
            p.user_id,
            GEO_PRIVACY_RADIUS_M,
          );

          return (
            <CircleMarker
              key={p.id}
              center={[obf.lat, obf.lng]}
              radius={8}
              pathOptions={{
                color,
                fillColor: color,
                fillOpacity: 0.8,
              }}
              eventHandlers={{
                // даём Leaflet открыть popup на первый клик
                click: () => {},
              }}
            >
              <Tooltip direction="top" offset={[0, -4]} opacity={1}>
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

              <Popup>
                <div className="space-y-1 text-xs">
                  {/* 1) Имя + Профессия + Онлайн/Оффлайн */}
                  <p className="text-sm font-semibold text-slate-900">
                    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span>{profile?.full_name || "Специалист"}</span>
                      {profile?.role_title ? (
                        <span>{profile.role_title}</span>
                      ) : null}
                      <span
                        className={`h-2 w-2 rounded-full ${
                          online ? "bg-emerald-500" : "bg-slate-400"
                        }`}
                        title={online ? "Онлайн" : "Оффлайн"}
                      />
                    </span>
                  </p>

                  {/* 2) Отрасль */}
                  <p className="text-[11px] text-slate-600">
                    <span className="font-medium text-slate-700">Отрасль:</span>{" "}
                    {profile?.industry || "Не указана"}
                  </p>

                  {/* 3) Подотрасль */}
                  <p className="text-[11px] text-slate-600">
                    <span className="font-medium text-slate-700">Подотрасль:</span>{" "}
                    {profile?.subindustry || "Не указана"}
                  </p>

                  {/* 4) О себе */}
                  <p className="text-[11px] text-slate-600 whitespace-pre-line">
                    <span className="block font-medium text-slate-700">
                      О себе:
                    </span>{" "}
                    {profile?.skills
                      ? profile.skills.slice(0, 220) +
                        (profile.skills.length > 220 ? "…" : "")
                      : "Не указано"}
                  </p>

                  {/* 5) Ресурсы */}
                  <p className="text-[11px] text-slate-600 whitespace-pre-line">
                    <span className="block font-medium text-slate-700">
                      Ресурсы:
                    </span>{" "}
                    {profile?.resources
                      ? profile.resources.slice(0, 220) +
                        (profile.resources.length > 220 ? "…" : "")
                      : "Не указано"}
                  </p>
                  {profile?.rating_count != null ? (
                    <div className="flex justify-end">
                      <p className="text-[11px] font-medium text-slate-700">
                        Рейтинг {profile.rating_count}
                      </p>
                    </div>
                  ) : null}
                  <div className="mt-2 flex gap-2">
                    <Link
                      href={`/profiles/${p.user_id}`}
                      className="inline-flex items-center rounded-full border border-slate-200 px-3 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Профиль
                    </Link>
                    <button
                      type="button"
                      onClick={() => onOpenChat?.(p.user_id)}
                      className="inline-flex items-center rounded-full bg-sky-600 px-3 py-1 text-[11px] font-medium text-white hover:bg-sky-700"
                    >
                      Написать
                    </button>
                    {onToggleContact ? (
                      <button
                        type="button"
                        onClick={() => onToggleContact(p.user_id)}
                        className="inline-flex items-center rounded-full border border-slate-200 px-3 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                      >
                        {contactSet.has(p.user_id)
                          ? "Удалить"
                          : "Добавить в контакты"}
                      </button>
                    ) : null}
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}

