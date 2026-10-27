"use client";

// Сервисы профиля вынесены в библиотеку @my-startup/profile.
// Этот файл остаётся для обратной совместимости импортов `@/services/profileService`.

export {
  getProfessionMatchIndex,
  profileMatchesProfession,
  parseInterestedProfessions,
  serializeInterestedProfessions,
  profileInterestedInProfession,
} from "@my-startup/profile";

export {
  PROFILE_MAP_SELECT,
  fetchActiveLocations,
  fetchOwnActiveLocation,
  fetchActiveLocationUserIds,
  fetchProfilesForMap,
  fetchProfileForMapById,
  fetchProfilesInterestedIn,
  type LocationPointRow,
} from "@my-startup/profile";

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

export {
  fetchCurrentUserProfileRow,
  updateProfileLastSeen,
  fetchTopBarProfile,
  setProfileMapVisible,
  fetchMapVisible,
  type CurrentProfileRow,
  type TopBarProfileRow,
} from "@my-startup/profile";

export {
  fetchProfileLikeCount,
  fetchViewerHasLiked,
  removeProfileLike,
  insertProfileLike,
  resolveProfileShareCode,
} from "@my-startup/profile";

export {
  upsertProfilePrivate,
  insertLocation,
  claimPioneerSlot,
  completeOnboarding,
  deleteProfileWork,
  insertProfileWork,
  fetchOrCreateOnboardingProfile,
  fetchOrCreateEditorProfile,
  fetchProfileLastName,
  fetchProfileWorkBlocks,
  fetchLocationForProfile,
  fetchLocationCoordsForProfile,
  updateProfileById,
  upsertActiveLocation,
} from "@my-startup/profile";

export {
  countContactsForOwner,
  fetchContactProfiles,
} from "@my-startup/profile";
