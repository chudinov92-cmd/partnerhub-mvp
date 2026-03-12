"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip } from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import { supabase } from "@/lib/supabaseClient";

type LocationPoint = {
  id: string;
  lat: number;
  lng: number;
  city: string | null;
  profiles: {
    full_name: string | null;
    user_specialties?: {
      is_primary: boolean | null;
      specialties: {
        slug: string;
        name: string;
      } | null;
    }[];
  } | null;
};

const PERM_CENTER: LatLngExpression = [58.01, 56.25];

function jitterCoordinate(lat: number, lng: number) {
  // ~150 м в градусах широты (~0.00135)
  const maxOffset = 0.00135;
  const dLat = (Math.random() * 2 - 1) * maxOffset;
  const dLng = (Math.random() * 2 - 1) * maxOffset;
  return [lat + dLat, lng + dLng] as [number, number];
}

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

function getMarkerColor(point: LocationPoint) {
  const specialties = point.profiles?.user_specialties;
  if (!specialties || specialties.length === 0) {
    return "#0ea5e9"; // дефолтный голубой
  }

  // сначала пробуем primary
  const primary = specialties.find((s) => s.is_primary && s.specialties?.slug);
  const slug =
    primary?.specialties?.slug ||
    specialties.find((s) => s.specialties?.slug)?.specialties?.slug;

  if (slug && SPECIALTY_COLORS[slug]) {
    return SPECIALTY_COLORS[slug];
  }

  return "#0ea5e9";
}

export function PartnerMap() {
  const [points, setPoints] = useState<LocationPoint[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from("locations")
        .select(
          "id, lat, lng, city, profiles(full_name, user_specialties(is_primary, specialties(slug, name)))",
        )
        .eq("is_active", true)
        .limit(200);

      if (!error && data) {
        // Supabase возвращает связанные записи как массив, нормализуем в один профиль
        const normalized: LocationPoint[] = (data as any[]).map((row) => {
          const profileArray = row.profiles as any[] | null | undefined;
          const profile = profileArray && profileArray.length > 0
            ? profileArray[0]
            : null;

          return {
            id: row.id,
            lat: row.lat,
            lng: row.lng,
            city: row.city ?? null,
            profiles: profile
              ? {
                  full_name: profile.full_name ?? null,
                  user_specialties: profile.user_specialties ?? [],
                }
              : null,
          };
        });

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
          const [jLat, jLng] = jitterCoordinate(p.lat, p.lng);
          const color = getMarkerColor(p);

          return (
            <CircleMarker
              key={p.id}
              center={[jLat, jLng]}
              radius={8}
              pathOptions={{
                color,
                fillColor: color,
                fillOpacity: 0.8,
              }}
            >
              <Tooltip direction="top" offset={[0, -4]} opacity={1}>
                <div className="text-xs">
                  <div className="font-semibold">
                    {p.profiles?.full_name || "Специалист"}
                  </div>
                  {p.city && <div className="text-slate-500">{p.city}</div>}
                </div>
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}

