"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MapContainer, TileLayer, CircleMarker, Tooltip, Popup } from "react-leaflet";
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

const SPECIALTY_COLORS: Record<string, string> = {
  // гуманитарии
  marketing: "#22c55e", // зелёный
  sales: "#22c55e",
  product: "#22c55e",
  design: "#22c55e",
  // производство / тех
  dev: "#3b82f6", // синий
  ops: "#3b82f6",
  // финансы / юристы
  finance: "#a855f7", // фиолетовый
  legal: "#a855f7",
};

function getMarkerColor(slug?: string | null) {
  if (slug && SPECIALTY_COLORS[slug]) {
    return SPECIALTY_COLORS[slug];
  }
  return "#0ea5e9";
}

export type PartnerMapProps = {
  onOpenChat?: (profileId: string) => void;
  profiles: {
    id: string;
    full_name: string | null;
    city: string | null;
    industry?: string | null;
    subindustry?: string | null;
    role_title?: string | null;
    user_specialties?: {
      is_primary: boolean | null;
      specialties: {
        slug?: string;
        name?: string;
      } | null;
    }[];
  }[];
};

export function PartnerMap({ onOpenChat, profiles }: PartnerMapProps) {
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

  return (
    <div className="h-full min-h-[420px] w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm">
      <MapContainer
        center={PERM_CENTER}
        zoom={12}
        scrollWheelZoom={false}
        attributionControl={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {points.map((p) => {
          const profile = profileById[p.user_id];
          const specialties = profile?.user_specialties ?? [];
          const primary = specialties.find(
            (s) => s.is_primary && s.specialties?.slug,
          );
          const slug =
            primary?.specialties?.slug ||
            specialties.find((s) => s.specialties?.slug)?.specialties?.slug;
          const color = getMarkerColor(slug);

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
                  <p className="text-[11px] text-slate-600">
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

