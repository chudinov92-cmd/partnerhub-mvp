"use client";

import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
} from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import L from "leaflet";

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

  const pinIcon = L.divIcon({
    className: "",
    html: `<div style="
      width: 14px;
      height: 14px;
      border-radius: 9999px;
      background: #ef4444;
      border: 2px solid #ef4444;
      box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.25);
    "></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });

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
          <Marker
            position={[value.lat, value.lng]}
            draggable
            icon={pinIcon}
            eventHandlers={{
              dragend: (e) => {
                const latlng = e.target.getLatLng();
                onChange({ lat: latlng.lat, lng: latlng.lng });
              },
            }}
          />
        )}
      </MapContainer>
    </div>
  );
}

