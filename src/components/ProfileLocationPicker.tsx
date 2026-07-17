"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import mmrgl from "mmr-gl";
import "mmr-gl/dist/mmr-gl.css";
import type { LngLat } from "@/data/cityMapViews";

const PERM_CENTER: LngLat = [56.25, 58.01];
const DEFAULT_ZOOM = 12;
const PIN_FILL_COLOR = "#10B981";
const PIN_BORDER_COLOR = "#FFFFFF";
const VK_MAP_STYLE = "mmr://api/styles/main_style.json";

type Props = {
  value: { lat: number; lng: number } | null;
  onChange: (coords: { lat: number; lng: number }) => void;
  className?: string;
  markerLabel?: string;
};

function escapeHtmlText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function createProfilePinElement(letter: string): HTMLElement {
  const safeLetter = escapeHtmlText(letter.slice(0, 1).toUpperCase() || "Я");
  const root = document.createElement("div");
  root.className = "partner-map-marker-root profile-location-marker";
  root.innerHTML = `<div class="partner-map-pin-wrap">
    <div class="partner-map-pin-head" style="background-color:${PIN_FILL_COLOR};border-color:${PIN_BORDER_COLOR}">
      <span class="partner-map-pin-letter">${safeLetter}</span>
    </div>
    <div class="partner-map-pin-stem" style="background-color:${PIN_FILL_COLOR}"></div>
  </div>`;
  return root;
}

export function ProfileLocationPicker({
  value,
  onChange,
  className,
  markerLabel = "Я",
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mmrgl.Map | null>(null);
  const markerRef = useRef<mmrgl.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  const markerLabelRef = useRef(markerLabel);
  const hadValueRef = useRef(false);
  const [geoBusy, setGeoBusy] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    markerLabelRef.current = markerLabel;
  }, [markerLabel]);

  const syncMarker = useCallback((map: mmrgl.Map, coords: { lat: number; lng: number } | null) => {
    if (!coords) {
      markerRef.current?.remove();
      markerRef.current = null;
      hadValueRef.current = false;
      return;
    }

    const lngLat: LngLat = [coords.lng, coords.lat];

    if (markerRef.current) {
      markerRef.current.setLngLat(lngLat);
    } else {
      const marker = new mmrgl.Marker({
        element: createProfilePinElement(markerLabelRef.current),
        draggable: true,
        anchor: "bottom",
      })
        .setLngLat(lngLat)
        .addTo(map);

      marker.on("dragend", () => {
        const { lat, lng } = marker.getLngLat();
        onChangeRef.current({ lat, lng });
      });

      markerRef.current = marker;

      if (!hadValueRef.current) {
        map.jumpTo({ center: lngLat, zoom: DEFAULT_ZOOM });
        hadValueRef.current = true;
      }
    }
  }, []);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const token = process.env.NEXT_PUBLIC_VK_MAPS_API_KEY?.trim();
    if (token) {
      mmrgl.accessToken = token;
    }

    const center: LngLat = value ? [value.lng, value.lat] : PERM_CENTER;

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

    const onReady = () => {
      syncMarker(map, value);
      map.resize();
    };

    if (map.loaded()) onReady();
    else map.once("load", onReady);

    mapRef.current = map;

    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => map.resize())
        : null;
    ro?.observe(containerRef.current);

    return () => {
      ro?.disconnect();
      markerRef.current?.remove();
      markerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init once
  }, [syncMarker]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const apply = () => {
      syncMarker(map, value);
      map.resize();
    };

    if (map.loaded()) apply();
    else map.once("load", apply);
  }, [value, syncMarker]);

  const handleGeolocate = () => {
    setGeoError(null);
    if (!navigator.geolocation) {
      setGeoError("Геолокация недоступна в этом браузере");
      return;
    }

    setGeoBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoBusy(false);
        onChangeRef.current({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      (err) => {
        setGeoBusy(false);
        setGeoError(
          err.code === err.PERMISSION_DENIED
            ? "Разрешите доступ к геолокации в настройках браузера"
            : "Не удалось определить местоположение",
        );
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  };

  return (
    <div className="relative">
      <div
        className={
          className ??
          "h-64 w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100"
        }
      >
        <div ref={containerRef} className="mmrgl-map h-full w-full" />
      </div>

      <div className="absolute right-3 top-3 z-10 flex flex-col items-end gap-2">
        <button
          type="button"
          onClick={handleGeolocate}
          disabled={geoBusy}
          className="rounded-lg border border-slate-200 bg-white/95 px-3 py-1.5 text-xs font-medium text-slate-800 shadow-sm backdrop-blur hover:bg-white disabled:opacity-60"
        >
          {geoBusy ? "Определяем…" : "Моё местоположение"}
        </button>
        {geoError ? (
          <p className="max-w-[12rem] rounded-lg bg-white/95 px-2 py-1 text-right text-[11px] text-red-600 shadow-sm backdrop-blur">
            {geoError}
          </p>
        ) : null}
      </div>
    </div>
  );
}
