"use client";

// Сервис вьюпорта карты вынесен в библиотеку @my-startup/profile.
// Этот файл остаётся для обратной совместимости импортов `@/services/profile/viewport`.
export {
  loadMapViewportData,
  fetchMapViewportPins,
  fetchMapGridClusters,
  fetchMapViewportPointsLight,
  fetchMapProfilesInterestedInViewport,
  feedFiltersToMapParams,
  expandBbox,
  bboxFromLngLatBounds,
  getMapViewportMode,
  pinRowsToProfiles,
  pinRowsToLocationPoints,
  MAP_ZOOM_GRID_MAX,
  MAP_ZOOM_STREET_MIN,
  MAP_HTML_PIN_LIMIT,
  MAP_PRO_BREAKOUT_CAP,
  type MapBbox,
  type MapGridCluster,
  type MapLightPoint,
  type MapViewportPinRow,
  type MapViewportMode,
  type MapViewportFilterParams,
} from "@my-startup/profile";