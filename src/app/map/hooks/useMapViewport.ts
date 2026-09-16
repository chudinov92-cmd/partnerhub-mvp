"use client";

import { useCallback, useRef, useState } from "react";
import type { FeedFilters, Profile } from "@/types";
import { RUSSIA_LABEL } from "@/data/cities";
import {
  bboxFromLngLatBounds,
  feedFiltersToMapParams,
  loadMapViewportData,
  pinRowsToLocationPoints,
  pinRowsToProfiles,
  type MapBbox,
  type MapViewportPinRow,
  type MapGridCluster,
  type MapLightPoint,
  type MapViewportMode,
} from "@/services/profileService";
import { isOnline } from "../utils";

function applyOfflineFilter(
  profiles: Profile[],
  onlineStatus: FeedFilters["online_status"],
): Profile[] {
  if (onlineStatus !== "offline") return profiles;
  return profiles.filter((p) => !isOnline(p.last_seen_at ?? null));
}

export function useMapViewport(opts: {
  feedFilters: FeedFilters;
  contactsOnlyMode: boolean;
  contactProfileIds: string[];
  selectedCity: string;
  currentUserProfileId?: string | null;
  currentUserRoleTitle?: string | null;
  focusedProfileId?: string | null;
}) {
  const [mapViewportMode, setMapViewportMode] =
    useState<MapViewportMode>("cluster");
  const [mapLocations, setMapLocations] = useState<
    ReturnType<typeof import("@/services/profile/viewport").pinRowsToLocationPoints>
  >([]);
  const [mapProfiles, setMapProfiles] = useState<Profile[]>([]);
  const [mapLightPoints, setMapLightPoints] = useState<MapLightPoint[]>([]);
  const [mapGridClusters, setMapGridClusters] = useState<MapGridCluster[]>([]);
  const [mapOwnLocation, setMapOwnLocation] = useState<
    ReturnType<typeof pinRowsToLocationPoints>[number] | null
  >(null);
  const [mapViewportLoading, setMapViewportLoading] = useState(true);
  const [mapViewportError, setMapViewportError] = useState<string | null>(null);

  const lastBboxRef = useRef<string>("");
  const lastViewportRef = useRef<{ bbox: MapBbox; zoom: number } | null>(null);
  const fetchGenRef = useRef(0);

  const buildFilterParams = useCallback(() => {
    const interestedInRole = opts.feedFilters.recommendedContacts
      ? (opts.currentUserRoleTitle ?? "").trim() || null
      : null;

    return feedFiltersToMapParams(opts.feedFilters, {
      contactsOnly: opts.contactsOnlyMode,
      contactProfileIds: opts.contactProfileIds,
      selectedCity: opts.selectedCity,
      interestedInRole,
    });
  }, [
    opts.feedFilters,
    opts.contactsOnlyMode,
    opts.contactProfileIds,
    opts.selectedCity,
    opts.currentUserRoleTitle,
  ]);

  const applyViewportResult = useCallback(
    (
      mode: MapViewportMode,
      pinRows: MapViewportPinRow[],
      lightPoints: MapLightPoint[],
      gridClusters: MapGridCluster[],
    ) => {
      setMapViewportMode(mode);

      let profiles = pinRowsToProfiles(pinRows);
      profiles = applyOfflineFilter(profiles, opts.feedFilters.online_status);
      setMapProfiles(profiles);

      const ownProfileId = opts.currentUserProfileId?.trim();
      const ownRow =
        ownProfileId != null && ownProfileId !== ""
          ? pinRows.find((row) => row.user_id === ownProfileId)
          : undefined;
      setMapOwnLocation(
        ownRow ? (pinRowsToLocationPoints([ownRow])[0] ?? null) : null,
      );

      if (mode === "street") {
        setMapLocations(pinRowsToLocationPoints(pinRows));
        setMapLightPoints([]);
        setMapGridClusters([]);
        return;
      }

      setMapLocations([]);
      if (mode === "grid") {
        setMapGridClusters(gridClusters);
        setMapLightPoints([]);
        return;
      }

      setMapLightPoints(lightPoints);
      setMapGridClusters([]);
    },
    [opts.feedFilters.online_status, opts.currentUserProfileId],
  );

  const refreshMapViewport = useCallback(
    async (bbox: MapBbox, zoom: number, force = false) => {
      const bboxKey = `${bbox.minLat.toFixed(4)}:${bbox.maxLat.toFixed(4)}:${bbox.minLng.toFixed(4)}:${bbox.maxLng.toFixed(4)}:${zoom.toFixed(1)}`;
      if (!force && bboxKey === lastBboxRef.current) return;
      lastBboxRef.current = bboxKey;

      const gen = ++fetchGenRef.current;
      setMapViewportLoading(true);
      setMapViewportError(null);

      try {
        const data = await loadMapViewportData({
          bbox,
          zoom,
          params: buildFilterParams(),
          ownProfileId: opts.currentUserProfileId,
          focusedProfileId: opts.focusedProfileId,
        });

        if (gen !== fetchGenRef.current) return;

        applyViewportResult(
          data.mode,
          data.pinRows,
          data.lightPoints,
          data.gridClusters,
        );
      } catch (err) {
        if (gen !== fetchGenRef.current) return;
        const msg =
          err instanceof Error ? err.message : "Не удалось загрузить карту";
        setMapViewportError(msg);
      } finally {
        if (gen === fetchGenRef.current) {
          setMapViewportLoading(false);
        }
      }
    },
    [
      applyViewportResult,
      buildFilterParams,
      opts.currentUserProfileId,
      opts.focusedProfileId,
      opts.feedFilters.recommendedContacts,
      opts.feedFilters.online_status,
      opts.selectedCity,
    ],
  );

  const mergeMapProfile = useCallback((profile: Profile) => {
    setMapProfiles((prev) =>
      prev.some((p) => p.id === profile.id) ? prev : [...prev, profile],
    );
  }, []);

  const handleMapViewportChange = useCallback(
    (sw: { lng: number; lat: number }, ne: { lng: number; lat: number }, zoom: number) => {
      const bbox = bboxFromLngLatBounds(sw, ne);
      lastViewportRef.current = { bbox, zoom };
      void refreshMapViewport(bbox, zoom);
    },
    [refreshMapViewport],
  );

  const invalidateMapViewport = useCallback(() => {
    lastBboxRef.current = "";
    const last = lastViewportRef.current;
    if (last) {
      void refreshMapViewport(last.bbox, last.zoom, true);
    }
  }, [refreshMapViewport]);

  return {
    mapViewportMode,
    mapLocations,
    mapProfiles,
    mapLightPoints,
    mapGridClusters,
    mapOwnLocation,
    mapViewportLoading,
    mapViewportError,
    handleMapViewportChange,
    refreshMapViewport,
    invalidateMapViewport,
    mergeMapProfile,
    setMapProfiles,
  };
}
