"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { deleteBlock, insertBlock, getEffectiveViewedProfileIds } from "@/services/contactService";
import { fetchProfileForMapById, getProfessionMatchIndex, profileMatchesProfession } from "@/services/profileService";
import {
  getSupportProfileId,
  isChatClosed,
  loadDmUnreadCounts,
} from "@/services/chatService";
import {
  getSupportProfileIdFromEnv,
  isAppealMessage,
} from "@/lib/support";
import { SupportAppealCard } from "@/components/SupportAppealCard";
import { ProfileShareCard } from "@/components/ProfileShareCard";
import { MessageLinks } from "@/components/MessageLinks";
import {
  buildProfileMapShareUrl,
  buildProfileShortUrl,
  isProfileShareMessage,
} from "@/lib/profileShare";
import {
  getSubscriptionStatus,
  getEffectiveSubscriptionPlan,
} from "@/services/subscriptionService";
import { comparePlanRank, FREE_PROFILE_VIEWS_LIMIT } from "@/lib/subscriptionPlans";
import { isPaidGateMode } from "@/lib/accessMode";
import {
  canUnpaidOpenPinPopup,
  recordUnpaidPinPopupView,
} from "@/lib/unpaidPinViews";
import { PaywallDrawer } from "@/components/PaywallDrawer";
import { PinLimitModal } from "@/components/PinLimitModal";
import { OnboardingPaywallBanner } from "@/components/OnboardingPaywallBanner";
import { WelcomeBanner } from "@/components/WelcomeBanner";
import { PaymentSuccessToast } from "@/components/PaymentSuccessToast";
import {
  savePendingPaywallContext,
  type PaywallIntentContext,
} from "@/lib/paywallIntent";
import {
  canShowPaywallDrawer,
  recordPaywallDismiss,
} from "@/lib/paywallFrequency";
import {
  trackPaywallDismissed,
  trackPaywallShown,
} from "@/lib/paywallAnalytics";
import type {
  Post,
  Profile,
  FeedFilters,
  ChatMessage,
  ChatListItem,
} from "@/types";
import { DEFAULT_FEED_FILTERS } from "@/types";
import {
  profileMatchesSeeking,
  SEEKING_OPTIONS,
  toggleArrayItem,
} from "@/lib/seekingOptions";
import { markWelcomeOnboardingShown } from "@/lib/welcomeOnboarding";
import {
  getProfessionLabelsForSelect,
  type ProfessionCatalogRow,
} from "@/lib/professionCatalog";
import {
  getIndustryLabelsForSelect,
  getSubindustryLabelsForSelect,
  type IndustryCatalogRow,
  type SubindustryCatalogRow,
} from "@/lib/industryCatalog";
import { getBrowserTimeZone, getTimeZoneByCity } from "@/lib/cityTimezone";
import { useSelectedCity } from "@/contexts/SelectedCityContext";
import { getMapConfigForCity } from "@/data/cityMapViews";
import { logDailyActivity, logMapSearchEvent } from "@/services/analyticsService";
import { RUSSIA_LABEL } from "@/data/cities";
import { PushOptInBanner } from "@/components/PushOptInBanner";
import { useAuth } from "@/hooks/useAuth";
import { useContacts } from "@/hooks/useContacts";
import { useMobileNav } from "@/hooks/useMobileNav";
import { useFeed } from "@/hooks/useFeed";
import { useProfiles } from "@/hooks/useProfiles";
import { useChatMessagesRealtime } from "@/hooks/useChat";
import { useAutoResizeTextarea } from "@/hooks/useAutoResizeTextarea";
import { usePreventBodyScroll, isOnline, scrollComposerIntoView } from "../utils";
import { useMapPageState } from "./useMapPageState";
import { useMapViewport } from "./useMapViewport";
import { useFeedHandlers } from "./useFeedHandlers";
import { useMapEffects } from "./useMapEffects";
import { useChatHandlers } from "./useChatHandlers";
import type { LightPointClickPayload, PartnerMapProps } from "@/components/PartnerMap";
import {
  INDUSTRY_OPTIONS,
  SORTED_INDUSTRY_OPTIONS,
  CURRENT_STATUS_OPTIONS,
  SUBINDUSTRY_OPTIONS,
  type Industry,
  sortRuAsc,
} from "../constants";

export type MapPageController = ReturnType<typeof useMapPageController>;

export function useMapPageController() {
  usePreventBodyScroll();
  const {
    isMobileLayout,
    setIsMobileLayout,
    expandedPosts,
    setExpandedPosts,
    feedFiltersOpen,
    setFeedFiltersOpen,
    mapViewMode,
    setMapViewMode,
    feedFilters,
    setFeedFilters,
    recommendedProfiles,
    setRecommendedProfiles,
    recommendedLoading,
    setRecommendedLoading,
    recommendedNotice,
    setRecommendedNotice,
    recommendedEmptyDismissed,
    setRecommendedEmptyDismissed,
    hasActiveFeedFilters,
    newPostBody,
    setNewPostBody,
    editingPostId,
    setEditingPostId,
    deletingPostId,
    setDeletingPostId,
    creating,
    setCreating,
    createError,
    setCreateError,
    activeChatUser,
    setActiveChatUser,
    activeChatId,
    setActiveChatId,
    chatMessages,
    setChatMessages,
    chatInput,
    setChatInput,
    editingMessageId,
    setEditingMessageId,
    deletingMessageId,
    setDeletingMessageId,
    chatLoading,
    setChatLoading,
    chatError,
    setChatError,
    chatSending,
    setChatSending,
    supportProfileId,
    setSupportProfileId,
    supportSubject,
    setSupportSubject,
    supportDescription,
    setSupportDescription,
    supportFieldErrors,
    setSupportFieldErrors,
    activeChatIsClosed,
    setActiveChatIsClosed,
    unreadByUser,
    setUnreadByUser,
    generalChatSearch,
    setGeneralChatSearch,
    chatScrollRef,
    chatWindowRef,
    newPostBodyRef,
    chatInputRef,
    supportDescriptionRef,
    suppressChatOutsideCloseUntilRef,
    feedScrollRef,
    activeProfileOverlay,
    setActiveProfileOverlay,
    pinLimitOpen,
    setPinLimitOpen,
    paywallOpen,
    setPaywallOpen,
    paywallContext,
    setPaywallContext,
    welcomeBannerVisible,
    setWelcomeBannerVisible,
    paymentToast,
    setPaymentToast,
    paywallResumeHandledRef,
    paymentSuccessHandledRef,
    focusedProfileId,
    setFocusedProfileId,
    feedFiltersRef,
    recommendedEmptyBannerRef,
    mapContainerRef,
    cityInitializedRef,
    blockBusyByProfileId,
    setBlockBusyByProfileId,
    chatDeepLinkNonce,
    setChatDeepLinkNonce,
    profileDeepLinkNonce,
    setProfileDeepLinkNonce,
    supportDeepLinkNonce,
    setSupportDeepLinkNonce,
  } = useMapPageState();

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const apply = () => setIsMobileLayout(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [setIsMobileLayout]);

  useAutoResizeTextarea(newPostBodyRef, newPostBody);
  useAutoResizeTextarea(chatInputRef, chatInput);
  useAutoResizeTextarea(supportDescriptionRef, supportDescription);
  const router = useRouter();

  const {
    contactsOnlyMode,
    mobileTab,
    handleMobileTab,
    resetContactsMode,
    setMobileTab,
  } = useMobileNav();

  const {
    profiles,
    setProfiles,
    chatList,
    setChatList,
    currentUser,
    setCurrentUser,
    currentUserReady,
    loading,
    error,
    chatMembershipRef,
  } = useAuth([]);

  const openPaywallDrawer = useCallback(
    (ctx: PaywallIntentContext) => {
      if (!canShowPaywallDrawer(ctx.intent)) {
        return;
      }
      setPaywallContext(ctx);
      setPaywallOpen(true);
      trackPaywallShown(ctx.intent);
    },
    [],
  );

  const closePaywallDrawer = useCallback(() => {
    trackPaywallDismissed(paywallContext.intent);
    recordPaywallDismiss(paywallContext.intent);
    setPaywallOpen(false);
  }, [paywallContext.intent]);

  const {
    contactProfileIds,
    viewedProfileStates,
    blockedProfileIds,
    setBlockedProfileIds,
    todayOpenedProfileIds,
    toggleContact,
    markProfileViewed,
  } = useContacts(currentUser, () => {
    openPaywallDrawer({ intent: "favorites_limit" });
  });

  const openProfileOverlay = useCallback(
    (profile: Profile): boolean => {
      if (
        isPaidGateMode() &&
        currentUser &&
        !currentUser.isPro &&
        currentUser.profileId !== profile.id
      ) {
        if (!canUnpaidOpenPinPopup(currentUser.profileId)) {
          setPinLimitOpen(true);
          return false;
        }
        recordUnpaidPinPopupView(currentUser.profileId);
      }

      if (
        !isPaidGateMode() &&
        currentUser &&
        currentUser.subscriptionPlan === "free" &&
        currentUser.profileId !== profile.id
      ) {
        const alreadyOpenedToday = todayOpenedProfileIds.includes(profile.id);
        if (
          !alreadyOpenedToday &&
          todayOpenedProfileIds.length >= FREE_PROFILE_VIEWS_LIMIT
        ) {
          openPaywallDrawer({ intent: "view_limit" });
          return false;
        }
      }

      setActiveProfileOverlay(profile);
      void markProfileViewed(
        profile.id,
        profile.content_updated_at ?? new Date().toISOString(),
      );
      return true;
    },
    [currentUser, todayOpenedProfileIds, openPaywallDrawer, markProfileViewed],
  );

  const shareProfileLink = useCallback(async (profile: Profile) => {
    let url = buildProfileMapShareUrl(profile.id);
    try {
      const res = await fetch("/api/profile/share-link", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile_id: profile.id }),
      });
      const json = (await res.json()) as { url?: string; code?: string };
      if (res.ok && json.url) {
        url = json.url;
      } else if (res.ok && json.code) {
        url = buildProfileShortUrl(json.code);
      }
    } catch {
      /* fallback на длинную ссылку */
    }

    const title = profile.full_name || "Профиль на Zeip";
    const text =
      [profile.full_name, profile.role_title].filter(Boolean).join(" — ") ||
      title;

    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title, text, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setPaymentToast({
        message: "Ссылка скопирована",
        durationMs: 2000,
        showCloseButton: false,
      });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setPaymentToast({
        message: url,
        durationMs: 2000,
        showCloseButton: false,
      });
    }
  }, []);

  const openProfileFromChatLink = useCallback(
    async (profileId: string) => {
      if (!profileId || profileId === currentUser?.profileId) return;

      let profile = profiles.find((p) => p.id === profileId) ?? null;
      if (!profile) {
        try {
          profile = await fetchProfileForMapById(profileId);
        } catch (e) {
          console.error("Failed to load profile from chat link", e);
        }
      }

      if (profile) {
        openProfileOverlay(profile);
      } else {
        setPaymentToast({ message: "Профиль не найден или недоступен" });
      }
    },
    [currentUser?.profileId, profiles, openProfileOverlay],
  );

  const isSupportProfile = useCallback(
    (profileId: string) => {
      const sid = supportProfileId ?? getSupportProfileIdFromEnv() ?? null;
      return sid != null && profileId === sid;
    },
    [supportProfileId],
  );

  const refreshCurrentUserPro = useCallback(async () => {
    if (!currentUser) return;
    const status = await getSubscriptionStatus(currentUser.profileId);
    setCurrentUser((prev) =>
      prev
        ? {
            ...prev,
            isPro: status.isPro,
            subscriptionPlan: status.plan,
            trialUsed: status.trialUsed,
          }
        : prev,
    );
  }, [currentUser, setCurrentUser]);

  const effectiveViewedProfileIds = useMemo(
    () => getEffectiveViewedProfileIds(viewedProfileStates, profiles),
    [viewedProfileStates, profiles],
  );

  const { selectedCity, setSelectedCity } = useSelectedCity();
  const isRussiaChat = selectedCity === RUSSIA_LABEL;

  const {
    mapViewportMode,
    mapLocations,
    mapProfiles,
    mapLightPoints,
    mapGridClusters,
    mapOwnLocation,
    ownLocationResolved,
    mapViewportLoading,
    mapViewportError,
    handleMapViewportChange,
    invalidateMapViewport,
    mergeMapProfile,
  } = useMapViewport({
    feedFilters,
    contactsOnlyMode,
    contactProfileIds,
    selectedCity,
    currentUserProfileId: currentUser?.profileId,
    currentUserRoleTitle: currentUser?.roleTitle,
    focusedProfileId,
  });

  const profileReadyForMessaging = Boolean(
    currentUser &&
      (currentUser.city ?? "").trim() &&
      (currentUser.roleTitle ?? "").trim(),
  );

  const {
    posts,
    setPosts,
    commentsByPostId,
    setCommentsByPostId,
    postsLoading,
    postsLoadError,
    postsFingerprintRef,
  } = useFeed(selectedCity);

  const { professionCatalog, industryCatalog, subindustryCatalog } =
    useProfiles();

  const isSupportChat =
    Boolean(supportProfileId) &&
    activeChatUser?.id === supportProfileId;

  const showSupportAppealForm =
    isSupportChat &&
    Boolean(currentUser) &&
    (chatMessages.length === 0 || activeChatIsClosed) &&
    !editingMessageId;

  const resetSupportComposer = () => {
    setSupportSubject("");
    setSupportDescription("");
    setSupportFieldErrors({});
  };

  const closeChatWindow = () => {
    setActiveChatUser(null);
    setActiveChatId(null);
    setChatMessages([]);
    setChatError(null);
    setActiveChatIsClosed(false);
    resetSupportComposer();
    setEditingMessageId(null);
    setDeletingMessageId(null);
    setChatInput("");
  };
  const mapConfig = useMemo(
    () => getMapConfigForCity(selectedCity),
    [selectedCity],
  );

  const timeZone = useMemo(() => {
    const tzFromProfileCity = getTimeZoneByCity(currentUser?.city);
    return tzFromProfileCity ?? getBrowserTimeZone() ?? "Europe/Moscow";
  }, [currentUser?.city]);

  const {
    handleToggleRecommended,
    handleTogglePost,
    formatDateTime,
    canWriteGeneralChat,
    handleCreatePost,
    handleDeletePost,
    handleSubmitComment,
  } = useFeedHandlers({
    currentUser,
    feedFilters,
    setFeedFilters,
    setRecommendedProfiles,
    setRecommendedNotice,
    setRecommendedLoading,
    setExpandedPosts,
    newPostBody,
    setNewPostBody,
    editingPostId,
    setEditingPostId,
    deletingPostId,
    setDeletingPostId,
    creating,
    setCreating,
    setCreateError,
    selectedCity,
    setPosts,
    setCommentsByPostId,
    postsFingerprintRef,
    timeZone,
  });

  useEffect(() => {
    if (!currentUser?.profileId) return;
    void logDailyActivity();
  }, [currentUser?.profileId]);

  useEffect(() => {
    if (mapProfiles.length === 0) return;
    setProfiles(mapProfiles);
  }, [mapProfiles, setProfiles]);

  useEffect(() => {
    if (!currentUser?.profileId) return;
    void fetchProfileForMapById(currentUser.profileId).then((ownProfile) => {
      if (ownProfile) mergeMapProfile(ownProfile);
    });
  }, [currentUser?.profileId, mergeMapProfile]);

  useEffect(() => {
    invalidateMapViewport();
  }, [
    feedFilters,
    contactsOnlyMode,
    contactProfileIds,
    selectedCity,
    focusedProfileId,
    currentUser?.profileId,
    invalidateMapViewport,
  ]);

  useEffect(() => {
    if (!currentUser || loading) return;
    if (!currentUser.onboardingCompleted) {
      router.replace(`/onboarding?step=${currentUser.onboardingStep ?? 0}`);
    }
  }, [currentUser, loading, router]);

  useEffect(() => {
    if (cityInitializedRef.current) return;
    if (!currentUser?.city) return;

    const savedCity =
      typeof window !== "undefined"
        ? window.localStorage.getItem("selected_city")
        : null;

    if (!savedCity) {
      setSelectedCity(currentUser.city);
    }

    cityInitializedRef.current = true;
  }, [currentUser, setSelectedCity]);

  // подгружаем сохранённые фильтры ленты
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem("feed_filters");
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as FeedFilters;
      setFeedFilters({
        ...DEFAULT_FEED_FILTERS,
        ...parsed,
        recommendedContacts: false,
        seeking: Array.isArray(parsed.seeking) ? parsed.seeking : [],
      });
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    setEditingPostId(null);
    setNewPostBody("");
    setCreateError(null);
  }, [selectedCity]);

  useEffect(() => {
    if (!currentUser) return;
    void getSupportProfileId()
      .then((id) => setSupportProfileId(id))
      .catch((e) => {
        console.error("[map] getSupportProfileId failed", e);
      });
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) {
      setUnreadByUser({});
      return;
    }
    let cancelled = false;
    void loadDmUnreadCounts(currentUser.profileId, [
      ...blockedProfileIds,
    ]).then((counts) => {
      if (!cancelled) setUnreadByUser(counts);
    });
    return () => {
      cancelled = true;
    };
  }, [currentUser?.profileId, blockedProfileIds]);

  const knownChatIds = useMemo(
    () => chatList.map((item) => item.chatId),
    [chatList],
  );

  useChatMessagesRealtime({
    currentUser,
    activeChatId,
    blockedProfileIds,
    knownChatIds,
    chatMembershipRef,
    setChatMessages,
    setUnreadByUser,
    setChatList,
  });

  useEffect(() => {
    if (!isSupportChat || !activeChatId) return;
    void isChatClosed(activeChatId).then(setActiveChatIsClosed);
  }, [chatMessages.length, isSupportChat, activeChatId]);

  const visiblePosts = useMemo(() => {
    const normalizedAuthor = (a: any) => (Array.isArray(a) ? a[0] : a);

    return posts
      .filter((post) => {
      const a = normalizedAuthor(post.author);
      if (!a) return true;

      if (feedFilters.profession) {
        if ((a.role_title ?? null) !== feedFilters.profession) return false;
      }
      if (feedFilters.industry) {
        if ((a.industry ?? null) !== feedFilters.industry) return false;
      }
      if (feedFilters.subindustry) {
        if ((a.subindustry ?? null) !== feedFilters.subindustry) return false;
      }
      if (feedFilters.current_status) {
        if ((a.current_status ?? null) !== feedFilters.current_status)
          return false;
      }
      if (feedFilters.online_status) {
        const online = isOnline(a.last_seen_at ?? null);
        if (feedFilters.online_status === "online" && !online) return false;
        if (feedFilters.online_status === "offline" && online) return false;
      }
      if (feedFilters.age_from != null || feedFilters.age_to != null) {
        const age = typeof a.age === "number" ? a.age : null;
        if (age == null) return false;
        if (feedFilters.age_from != null && age < feedFilters.age_from) return false;
        if (feedFilters.age_to != null && age > feedFilters.age_to) return false;
      }
      return true;
      })
      .slice()
      .sort((a, b) => {
        const ta = a.created_at ? Date.parse(a.created_at) : 0;
        const tb = b.created_at ? Date.parse(b.created_at) : 0;
        return ta - tb; // сверху старые, снизу новые
      });
  }, [posts, feedFilters]);

  const searchedVisiblePosts = useMemo(() => {
    const q = generalChatSearch.trim().toLocaleLowerCase("ru-RU");
    if (!q) return visiblePosts;

    const normalizedAuthor = (a: any) => (Array.isArray(a) ? a[0] : a);

    return visiblePosts.filter((post) => {
      const body = String(post.body ?? "").toLocaleLowerCase("ru-RU");
      if (body.includes(q)) return true;
      const a = normalizedAuthor(post.author);
      const authorName = String(a?.full_name ?? "").toLocaleLowerCase("ru-RU");
      const role = String(a?.role_title ?? "").toLocaleLowerCase("ru-RU");
      return authorName.includes(q) || role.includes(q);
    });
  }, [visiblePosts, generalChatSearch]);

  useEffect(() => {
    const el = feedScrollRef.current;
    if (!el) return;
    // После отрисовки контейнера прокручиваем к последнему сообщению (низ ленты)
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [visiblePosts, loading, postsLoading, feedFilters]);

  const selectedProfessionRow = useMemo(() => {
    if (!feedFilters.profession) return null;
    return (
      professionCatalog.find((p) => p.label === feedFilters.profession) ?? null
    );
  }, [feedFilters.profession, professionCatalog]);


  const subindustryOptionsForFilters = useMemo(() => {
    const ind = feedFilters.industry ?? null;
    if (!ind) return [];
    if (industryCatalog.length > 0) {
      return getSubindustryLabelsForSelect(subindustryCatalog, ind).filter(
        (x) => x !== "Другое",
      );
    }
    return (SUBINDUSTRY_OPTIONS[ind as Industry] ?? []).slice().sort(sortRuAsc);
  }, [feedFilters.industry, industryCatalog.length, subindustryCatalog]);

  const filteredProfilesForMap = useMemo(() => {
    const source =
      feedFilters.recommendedContacts && recommendedProfiles !== null
        ? recommendedProfiles
        : mapProfiles;

    return source.filter((p) => {
      if (feedFilters.recommendedContacts) {
        if (
          selectedCity !== RUSSIA_LABEL &&
          (p.city ?? null) !== selectedCity
        ) {
          return false;
        }
        return true;
      }

      if (contactsOnlyMode) {
        if (!contactProfileIds.includes(p.id)) return false;
      }
      if (feedFilters.profession) {
        if (!profileMatchesProfession(p, feedFilters.profession)) return false;
      }
      if (feedFilters.industry) {
        if ((p.industry ?? null) !== feedFilters.industry) return false;
      }
      if (feedFilters.subindustry) {
        if ((p.subindustry ?? null) !== feedFilters.subindustry) return false;
      }
      if (feedFilters.current_status) {
        if ((p.current_status ?? null) !== feedFilters.current_status)
          return false;
      }
      if (feedFilters.online_status) {
        const online = isOnline(p.last_seen_at ?? null);
        if (feedFilters.online_status === "online" && !online) return false;
        if (feedFilters.online_status === "offline" && online) return false;
      }
      if (feedFilters.age_from != null || feedFilters.age_to != null) {
        const age = typeof p.age === "number" ? p.age : null;
        if (age == null) return false;
        if (feedFilters.age_from != null && age < feedFilters.age_from) return false;
        if (feedFilters.age_to != null && age > feedFilters.age_to) return false;
      }
      if (feedFilters.seeking.length > 0) {
        if (!profileMatchesSeeking(p.seeking, feedFilters.seeking)) return false;
      }
      return true;
    });
  }, [
    mapProfiles,
    recommendedProfiles,
    feedFilters,
    contactsOnlyMode,
    contactProfileIds,
    selectedCity,
  ]);

  const profilesForMapPins = useMemo(() => {
    const ownProfileId = currentUser?.profileId;
    if (!ownProfileId) return filteredProfilesForMap;

    if (filteredProfilesForMap.some((p) => p.id === ownProfileId)) {
      return filteredProfilesForMap;
    }

    const ownProfile =
      mapProfiles.find((p) => p.id === ownProfileId) ??
      profiles.find((p) => p.id === ownProfileId);
    if (!ownProfile) return filteredProfilesForMap;

    return [...filteredProfilesForMap, ownProfile];
  }, [filteredProfilesForMap, currentUser?.profileId, mapProfiles, profiles]);

  const recommendedProfilesAll = useMemo(() => {
    if (!recommendedProfiles) return [];
    return recommendedProfiles;
  }, [recommendedProfiles]);

  const showRecommendedEmptyRussiaPrompt =
    feedFilters.recommendedContacts &&
    !recommendedLoading &&
    recommendedProfiles !== null &&
    selectedCity !== RUSSIA_LABEL &&
    filteredProfilesForMap.length === 0 &&
    recommendedProfilesAll.length > 0;

  const showRecommendedEmptyAll =
    feedFilters.recommendedContacts &&
    !recommendedLoading &&
    recommendedProfiles !== null &&
    recommendedProfilesAll.length === 0;

  const showRecommendedEmptyBanner =
    feedFilters.recommendedContacts &&
    !recommendedLoading &&
    mapViewMode === "map" &&
    (showRecommendedEmptyRussiaPrompt || showRecommendedEmptyAll) &&
    !recommendedEmptyDismissed;

  useEffect(() => {
    setRecommendedEmptyDismissed(false);
  }, [feedFilters.recommendedContacts, selectedCity, recommendedProfiles]);

  useEffect(() => {
    if (!showRecommendedEmptyBanner) return;

    const dismiss = () => setRecommendedEmptyDismissed(true);

    const handleClick = (event: MouseEvent) => {
      if (!recommendedEmptyBannerRef.current) return;
      if (!recommendedEmptyBannerRef.current.contains(event.target as Node)) {
        dismiss();
      }
    };

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismiss();
    };

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [showRecommendedEmptyBanner]);

  const filteredChatList = useMemo(() => {
    if (!contactsOnlyMode) return chatList;
    return chatList.filter((item) => contactProfileIds.includes(item.profile.id));
  }, [chatList, contactsOnlyMode, contactProfileIds]);

  const unreadChatsTotal = useMemo(
    () => Object.values(unreadByUser).reduce((sum, n) => sum + n, 0),
    [unreadByUser],
  );

  const toggleBlock = async (profileId: string) => {
    if (!currentUser?.profileId) return;
    if (profileId === currentUser.profileId) return;

    const isBlocked = blockedProfileIds.includes(profileId);
    setBlockedProfileIds((prev) =>
      isBlocked ? prev.filter((x) => x !== profileId) : [...prev, profileId],
    );
    setBlockBusyByProfileId((prev) => ({ ...prev, [profileId]: true }));

    // если блокируем текущего собеседника — сразу скрываем его сообщения в UI
    if (!isBlocked && activeChatUser?.id === profileId) {
      setChatMessages((prev) => prev.filter((m) => m.sender_id !== profileId));
    }

    try {
      if (isBlocked) {
        await deleteBlock(currentUser.profileId, profileId);
      } else {
        await insertBlock(currentUser.profileId, profileId);
        setPaymentToast({
          message: "Сообщения этого пользователя больше не будут вам приходить.",
        });
      }
    } catch (e) {
      console.error("Failed to toggle block", e);
      setBlockedProfileIds((prev) =>
        isBlocked ? [...prev, profileId] : prev.filter((x) => x !== profileId),
      );
    } finally {
      setBlockBusyByProfileId((prev) => ({ ...prev, [profileId]: false }));
    }
  };

  // Закрытие поп-апа фильтров по клику вне и по Esc
  useEffect(() => {
    if (!feedFiltersOpen) return;

    const handleClick = (event: MouseEvent) => {
      if (!feedFiltersRef.current) return;
      if (!feedFiltersRef.current.contains(event.target as Node)) {
        setFeedFiltersOpen(false);
      }
    };

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFeedFiltersOpen(false);
    };

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [feedFiltersOpen]);

  const {
    openSupportChat,
    openChatWithProfile,
    handleWriteToProfile,
    openChatFromList,
    handleSendSupportAppeal,
    handleSendChatMessage,
    handleDeleteChatMessage,
  } = useChatHandlers({
    router,
    currentUser,
    supportProfileId,
    setSupportProfileId,
    blockedProfileIds,
    activeChatId,
    chatList,
    activeChatUser,
    chatInput,
    setChatInput,
    editingMessageId,
    setEditingMessageId,
    deletingMessageId,
    setDeletingMessageId,
    setChatLoading,
    setChatError,
    setChatSending,
    supportSubject,
    supportDescription,
    setSupportFieldErrors,
    activeChatIsClosed,
    setActiveChatIsClosed,
    setActiveChatUser,
    setActiveChatId,
    setChatMessages,
    setChatList,
    setUnreadByUser,
    chatMembershipRef,
    suppressChatOutsideCloseUntilRef,
    setActiveProfileOverlay,
    setMobileTab,
    openPaywallDrawer,
    resetSupportComposer,
    isSupportProfile,
    isSupportChat,
    showSupportAppealForm,
    profileReadyForMessaging,
  });

  const profilesRef = useRef(profiles);
  profilesRef.current = profiles;
  const openChatWithProfileRef = useRef(openChatWithProfile);
  openChatWithProfileRef.current = openChatWithProfile;

  const handleMapPinOpenProfile = useCallback(
    (p: PartnerMapProps["profiles"][number]) => {
      const full =
        profilesRef.current.find((x) => x.id === p.id) ?? (p as Profile);
      openProfileOverlay(full);
      setFocusedProfileId(null);
    },
    [openProfileOverlay, setFocusedProfileId],
  );

  const lastLightPointHintAtRef = useRef(0);
  const handleLightPointClick = useCallback(
    (payload: LightPointClickPayload) => {
      const now = Date.now();
      if (now - lastLightPointHintAtRef.current < 1500) return;
      lastLightPointHintAtRef.current = now;

      setPaymentToast({
        message: "Приблизьте карту, чтобы открыть профиль",
        actionLabel: "Приблизить",
        onAction: () => {
          payload.zoomToStreet();
          setPaymentToast(null);
        },
        durationMs: 5000,
        showCloseButton: true,
      });
    },
    [setPaymentToast],
  );

  const handleMapPinOpenChat = useCallback(
    (profileId: string) => {
      if (profileId === currentUser?.profileId) return;
      const p = profilesRef.current.find((pr) => pr.id === profileId);
      if (p) void openChatWithProfileRef.current(p);
    },
    [currentUser?.profileId],
  );

  // автоскролл к последнему сообщению при изменении списка
  useEffect(() => {
    if (!activeChatUser) return;
    const el = chatScrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [chatMessages, activeChatUser]);

  // закрытие окна чата по клику вне и по Esc
  useEffect(() => {
    if (!activeChatUser) return;

    const handleClick = (event: MouseEvent) => {
      if (Date.now() < suppressChatOutsideCloseUntilRef.current) return;
      const target = event.target as HTMLElement | null;
      // Если открыт поп-ап профиля, взаимодействие с ним не должно закрывать чат
      if (target?.closest?.("[data-profile-card]")) return;
      if (!chatWindowRef.current) return;
      if (!chatWindowRef.current.contains(event.target as Node)) {
        closeChatWindow();
      }
    };

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (document.querySelector("[data-profile-card]")) return;
        closeChatWindow();
      }
    };

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);

    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [activeChatUser]);

  // закрытие поп-апа профиля по клику вне и Esc
  useEffect(() => {
    if (!activeProfileOverlay) return;
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest?.("[data-profile-card]")) return;
      setActiveProfileOverlay(null);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveProfileOverlay(null);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [activeProfileOverlay]);

  useMapEffects({
    router,
    currentUser,
    loading,
    profiles,
    chatList,
    chatDeepLinkNonce,
    profileDeepLinkNonce,
    supportDeepLinkNonce,
    setChatDeepLinkNonce,
    openChatWithProfile,
    openSupportChat,
    openProfileOverlay,
    setPaymentToast,
    paywallResumeHandledRef,
    paymentSuccessHandledRef,
    openPaywallDrawer,
    setMobileTab,
    setWelcomeBannerVisible,
  });

  const showChatsColumn =
    mobileTab === "my-chats" || mobileTab === "contacts";
  const hideMobileMainStack = !!activeChatUser;
  return {
    isMobileLayout, mobileTab, hideMobileMainStack,
    welcomeBannerVisible, setWelcomeBannerVisible,
    expandedPosts, feedFiltersOpen, setFeedFiltersOpen, mapViewMode, setMapViewMode,
    feedFilters, setFeedFilters, recommendedProfiles, setRecommendedProfiles,
    recommendedLoading, recommendedNotice, setRecommendedNotice,
    recommendedEmptyDismissed, setRecommendedEmptyDismissed, hasActiveFeedFilters,
    newPostBody, setNewPostBody, editingPostId, setEditingPostId,
    deletingPostId, creating, createError, activeChatUser, activeChatId,
    chatMessages, chatInput, setChatInput, editingMessageId, setEditingMessageId,
    deletingMessageId, chatLoading, chatError, chatSending,
    supportSubject, setSupportSubject, supportDescription, setSupportDescription,
    supportFieldErrors, setSupportFieldErrors, activeChatIsClosed,
    unreadByUser, generalChatSearch, setGeneralChatSearch,
    chatScrollRef, chatWindowRef, newPostBodyRef, chatInputRef, supportDescriptionRef,
    feedScrollRef, activeProfileOverlay, setActiveProfileOverlay,
    pinLimitOpen, setPinLimitOpen, paywallOpen, closePaywallDrawer, paywallContext,
    paymentToast, setPaymentToast, focusedProfileId, setFocusedProfileId,
    feedFiltersRef, recommendedEmptyBannerRef, mapContainerRef,
    blockBusyByProfileId, router, contactsOnlyMode, handleMobileTab, resetContactsMode, setMobileTab,
    profiles, chatList, currentUser, currentUserReady, loading, error,
    handleMapPinOpenProfile, handleMapPinOpenChat, handleLightPointClick,
    openPaywallDrawer, openProfileOverlay, shareProfileLink, openProfileFromChatLink,
    contactProfileIds, blockedProfileIds, toggleContact, markProfileViewed,
    effectiveViewedProfileIds, selectedCity, setSelectedCity, isRussiaChat,
    profileReadyForMessaging, posts, postsLoading, postsLoadError,
    professionCatalog, industryCatalog, subindustryCatalog,
    isSupportChat, showSupportAppealForm, closeChatWindow,
    mapConfig, timeZone, visiblePosts, searchedVisiblePosts,
    subindustryOptionsForFilters, filteredProfilesForMap, profilesForMapPins,
    mapViewportMode, mapLocations, mapLightPoints, mapGridClusters,
    mapOwnLocation, ownLocationResolved,
    mapViewportLoading, mapViewportError, handleMapViewportChange,
    showRecommendedEmptyBanner, showRecommendedEmptyRussiaPrompt, showRecommendedEmptyAll,
    handleToggleRecommended, filteredChatList, unreadChatsTotal, toggleBlock,
    handleTogglePost, formatDateTime, canWriteGeneralChat,
    handleCreatePost, handleDeletePost, openSupportChat, openChatWithProfile,
    handleWriteToProfile, openChatFromList, handleSendSupportAppeal,
    handleSendChatMessage, handleDeleteChatMessage, showChatsColumn,
  };
}
