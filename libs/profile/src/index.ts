
export type {
  Post,
  Profile,
  ProfileWorkBlock,
  FeedFilters,
  CurrentUser,
} from './lib/types';
export { DEFAULT_FEED_FILTERS } from './lib/types';

// ── Константы ─────────────────────────────────────────────────────
export { MAX_RELATION_ROWS, MAX_COMMENTS_FETCH, POSTS_POLL_INTERVAL_MS } from './lib/constants';

// ── Чистые утилиты ────────────────────────────────────────────────
export {
  SEEKING_OPTIONS,
  type SeekingValue,
  toggleArrayItem,
  profileMatchesSeeking,
  seekingLabels,
} from './lib/utils/seekingOptions';
export {
  PROFILE_CONTACTS_CHANGED_EVENT,
  notifyProfileContactsChanged,
} from './lib/utils/contactEvents';

export { RUSSIA_LABEL } from './lib/utils/geoConstants';

// ── Справочники профессий и отраслей ──────────────────────────────
export {
  OTHER_PROFESSION_LABEL,
  type ProfessionCatalogRow,
  fetchProfessionCatalogFromDb,
  loadProfessionCatalog,
  getProfessionLabelsForSelect,
  ensureProfessionExists,
  upsertProfession,
  syncCustomProfessionToCatalog,
} from './lib/catalogs/professionCatalog';
export {
  appendProfessionToCatalog,
  findProfessionByKey,
  findSimilarProfessions,
  normalizeProfessionKey,
  PROFESSION_FUZZY_THRESHOLD,
  resolveProfessionInput,
  shouldUpsertProfession,
} from './lib/catalogs/professionCatalogMatch';
export {
  OTHER_INDUSTRY_LABEL,
  type IndustryCatalogRow,
  type SubindustryCatalogRow,
  fetchIndustryCatalogFromDb,
  fetchSubindustryCatalogFromDb,
  loadIndustryCatalog,
  loadSubindustryCatalog,
  upsertIndustry,
  upsertSubindustry,
  sortWithOtherLast,
  getIndustryLabelsForSelect,
  getSubindustryLabelsForSelect,
} from './lib/catalogs/industryCatalog';
export { maskProfanity } from './lib/catalogs/profanity';
export {
  msNow,
  readCatalogCache,
  shouldRefreshAt4amMsk,
  writeCatalogCache,
  type CatalogCacheKeys,
} from './lib/catalogs/catalogCache';

// ── Хуки ──────────────────────────────────────────────────────────
export { useProfiles } from './lib/hooks/useProfiles';
export { useContacts } from './lib/hooks/useContacts';

// ── Сервисы профиля ───────────────────────────────────────────────
export {
  getProfessionMatchIndex,
  profileMatchesProfession,
  parseInterestedProfessions,
  serializeInterestedProfessions,
  profileInterestedInProfession,
} from './lib/services/match';
export {
  PROFILE_MAP_SELECT,
  fetchActiveLocations,
  fetchOwnActiveLocation,
  fetchActiveLocationUserIds,
  fetchProfilesForMap,
  fetchProfileForMapById,
  fetchProfilesInterestedIn,
  type LocationPointRow,
} from './lib/services/map';
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
  MAP_LIGHT_POINTS_LIMIT,
  type MapBbox,
  type MapGridCluster,
  type MapLightPoint,
  type MapViewportPinRow,
  type MapViewportMode,
  type MapViewportFilterParams,
} from './lib/services/viewport';
export {
  fetchCurrentUserProfileRow,
  updateProfileLastSeen,
  fetchTopBarProfile,
  setProfileMapVisible,
  fetchMapVisible,
  type CurrentProfileRow,
  type TopBarProfileRow,
} from './lib/services/session';
export {
  fetchProfileLikeCount,
  fetchViewerHasLiked,
  removeProfileLike,
  insertProfileLike,
  resolveProfileShareCode,
} from './lib/services/likes';
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
} from './lib/services/editor';

// ── Сервис контактов ──────────────────────────────────────────────
export {
  countContactsForOwner,
  fetchContactProfileIds,
  fetchContactProfiles,
  fetchTodayOpenedProfileIds,
  countTodayProfileViews,
  fetchViewedProfileStates,
  getEffectiveViewedProfileIds,
  fetchBlockedProfileIds,
  deleteContact,
  insertContact,
  deleteBlock,
  insertBlock,
  upsertProfileView,
  FREE_FAVORITES_LIMIT,
  FREE_PROFILE_VIEWS_LIMIT,
} from './lib/services/contacts';

// ── Компоненты ────────────────────────────────────────────────────
export { ProfilePreviewCard } from './lib/components/ProfilePreviewCard';
export type { ProfilePreviewData } from './lib/components/ProfilePreviewCard';