"use client";

import { useEffect, useRef } from "react";
import mmrgl from "mmr-gl";
import "mmr-gl/dist/mmr-gl.css";
import type { LngLat } from "@/data/cityMapViews";

const PERM_CENTER: LngLat = [56.25, 58.01];
const DEFAULT_ZOOM = 12;
const VK_MAP_STYLE = "mmr://api/styles/main_style.json";

type Props = {
  value: { lat: number; lng: number } | null;
  onChange: (coords: { lat: number; lng: number }) => void;
  className?: string;
};

function createLocationPinElement(): HTMLElement {
  const el = document.createElement("div");
  el.style.width = "14px";
  el.style.height = "14px";
  el.style.borderRadius = "9999px";
  el.style.background = "#ef4444";
  el.style.border = "2px solid #ef4444";
  el.style.boxShadow = "0 0 0 3px rgba(239, 68, 68, 0.25)";
  return el;
}

export function ProfileLocationPicker({ value, onChange, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mmrgl.Map | null>(null);
  const markerRef = useRef<mmrgl.Marker | null>(null);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const token = process.env.NEXT_PUBLIC_VK_MAPS_API_KEY?.trim();
    if (token) {
      mmrgl.accessToken = token;
    }

    const center: LngLat = value
      ? [value.lng, value.lat]
      : PERM_CENTER;

    const map = new mmrgl.Map({
      container: containerRef.current,
      style: VK_MAP_STYLE,
      center,
      zoom: DEFAULT_ZOOM,
      scrollZoom: true,
      attributionControl: false,
    });

    map.on("click", (event) => {
      const { lat, lng } = event.lngLat;
      onChangeRef.current({ lat, lng });
    });

    mapRef.current = map;

    return () => {
      markerRef.current?.remove();
      markerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init once
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const syncMarker = () => {
      markerRef.current?.remove();
      markerRef.current = null;

      if (!value) return;

      const marker = new mmrgl.Marker({
        element: createLocationPinElement(),
        draggable: true,
        anchor: "center",
      })
        .setLngLat([value.lng, value.lat])
        .addTo(map);

      marker.on("dragend", () => {
        const { lat, lng } = marker.getLngLat();
        onChangeRef.current({ lat, lng });
      });

      markerRef.current = marker;
    };

    if (map.loaded()) {
      syncMarker();
    } else {
      map.once("load", syncMarker);
    }
  }, [value]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const center: LngLat = value ? [value.lng, value.lat] : PERM_CENTER;
    if (map.loaded()) {
      map.jumpTo({ center, zoom: DEFAULT_ZOOM });
      map.resize();
    } else {
      map.once("load", () => {
        map.jumpTo({ center, zoom: DEFAULT_ZOOM });
        map.resize();
      });
    }
  }, [value]);

  return (
    <div
      className={
        className ??
        "h-64 w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100"
      }
    >
      <div ref={containerRef} className="mmrgl-map h-full w-full" />
    </div>
  );
}
