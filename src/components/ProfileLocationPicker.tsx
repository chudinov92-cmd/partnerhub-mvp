"use client";

import {
  MapContainer,
  TileLayer,
  CircleMarker,
  useMapEvents,
} from "react-leaflet";
import type { LatLngExpression } from "leaflet";

const PERM_CENTER: LatLngExpression = [58.01, 56.25];

type Props = {
  value: { lat: number; lng: number } | null;
  onChange: (coords: { lat: number; lng: number }) => void;
};

function ClickHandler({ onChange }: { onChange: Props["onChange"] }) {
  useMapEvents({
    click(e) {
      onChange({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

export function ProfileLocationPicker({ value, onChange }: Props) {
  const center: LatLngExpression = value
    ? [value.lat, value.lng]
    : PERM_CENTER;

  return (
    <div className="h-64 w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
      <MapContainer
        center={center}
        zoom={12}
        scrollWheelZoom
        style={{ height: "100%", width: "100%" }}
        attributionControl={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <ClickHandler onChange={onChange} />
        {value && (
          <CircleMarker
            center={[value.lat, value.lng]}
            radius={10}
            pathOptions={{
              color: "#ef4444",
              fillColor: "#ef4444",
              fillOpacity: 0.35,
              weight: 2,
            }}
          />
        )}
      </MapContainer>
    </div>
  );
}

