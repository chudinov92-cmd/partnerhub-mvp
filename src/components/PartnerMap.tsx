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
  }[];
};

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

          return (
            <CircleMarker
              key={p.id}
              center={[p.lat, p.lng]}
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
                    {profile?.full_name || "Специалист"}
                  </div>
                  {profile?.role_title && (
                    <div className="text-slate-500">{profile.role_title}</div>
                  )}
                </div>
              </Tooltip>

              <Popup>
                <div className="space-y-1 text-xs">
                  <p className="text-sm font-semibold text-slate-900">
                    {profile?.full_name || "Специалист"}
                  </p>
                  {profile?.rating_count != null && (
                    <p className="text-[11px] font-medium text-slate-700">
                      Рейтинг {profile.rating_count}
                    </p>
                  )}
                  <p className="text-[11px] text-slate-600">
                    {/* Берём из "первого блока" (profiles.*), доп. блоки хранятся отдельно */}
                    {profile?.industry || "Отрасль не указана"}
                  </p>
                  {profile?.subindustry && (
                    <p className="text-[11px] text-slate-600">
                      {profile.subindustry}
                    </p>
                  )}
                  {profile?.role_title && (
                    <p className="text-[11px] text-slate-600">
                      {profile.role_title}
                    </p>
                  )}
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

