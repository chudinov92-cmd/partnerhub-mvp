"use client";

export {
  getProfessionMatchIndex,
  profileMatchesProfession,
  parseInterestedProfessions,
  serializeInterestedProfessions,
  profileInterestedInProfession,
} from "@/services/profile/match";

export {
  PROFILE_MAP_SELECT,
  fetchActiveLocations,
  fetchActiveLocationUserIds,
  fetchProfilesForMap,
  fetchProfileForMapById,
  fetchProfilesInterestedIn,
  type LocationPointRow,
} from "@/services/profile/map";

export {
  fetchCurrentUserProfileRow,
  updateProfileLastSeen,
  fetchTopBarProfile,
  setProfileMapVisible,
  fetchMapVisible,
  type CurrentProfileRow,
  type TopBarProfileRow,
} from "@/services/profile/session";

export {
  fetchProfileLikeCount,
  fetchViewerHasLiked,
  removeProfileLike,
  insertProfileLike,
  resolveProfileShareCode,
} from "@/services/profile/likes";

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
} from "@/services/profile/editor";

export { countContactsForOwner } from "@/services/contactService";
