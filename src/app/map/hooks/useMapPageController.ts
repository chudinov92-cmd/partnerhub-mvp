"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { deleteBlock, insertBlock, getEffectiveViewedProfileIds } from "@/services/contactService";
import { fetchProfilesInterestedIn, fetchProfileForMapById, getProfessionMatchIndex, profileMatchesProfession } from "@/services/profileService";
import {
  formatChatListPreview,
  openOrEnsurePrivateChat,
  fetchRecentMessages,
  updateMessageContent,
  deleteMessage,
  fetchLatestMessageMeta,
  insertMessage,
  getUniqueChatPartnersToday,
  fetchSupportProfile,
  getSupportProfileId,
  isChatClosed,
  reopenChat,
  loadDmUnreadCounts,
  markChatAsRead,
} from "@/services/chatService";
import {
  formatAppealMessage,
  getSupportProfileIdFromEnv,
  isAppealMessage,
  OPEN_SUPPORT_CHAT_EVENT,
  getChatErrorMessage,
  getErrorMessage,
  SUPPORT_STUB_PROFILE,
} from "@/lib/support";
import { notifyUsefulContactsChanged } from "@/lib/usefulContactEvents";
import { SupportAppealCard } from "@/components/SupportAppealCard";
import { ProfileShareCard } from "@/components/ProfileShareCard";
import { MessageLinks } from "@/components/MessageLinks";
import {
  buildProfileMapShareUrl,
  buildProfileShortUrl,
  isProfileShareMessage,
  PROFILE_MAP_QUERY_PARAM,
} from "@/lib/profileShare";
import {
  getDmPartnersDailyLimit,
  getSubscriptionStatus,
  getEffectiveSubscriptionPlan,
  canWriteGeneralChat as userCanWriteGeneralChat,
  canSendDirectMessages,
  PRO_PLUS_CHAT_LIMIT,
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
  clearPaywallQueryParams,
  clearPendingPaywallContext,
  parseMapSearchParams,
  readPendingPaywallContext,
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
  trackPaymentSuccessAha,
} from "@/lib/paywallAnalytics";
import {
  updatePostBody,
  deletePost,
  insertPost as insertFeedPost,
  insertPostComment,
  countTodayChatPosts,
} from "@/services/feedService";
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
import {
  markWelcomeOnboardingShown,
  shouldShowWelcomeOnboarding,
} from "@/lib/welcomeOnboarding";
import { maskProfanity } from "@/lib/profanity";
import {
  getProfessionLabelsForSelect,
  type ProfessionCatalogRow,
} from "@/lib/professionCatalog";
import { DropdownSelect } from "@/components/DropdownSelect";
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
import type { PostCommentRow } from "@/components/PostComments";
import { PushOptInBanner } from "@/components/PushOptInBanner";
import { useAuth } from "@/hooks/useAuth";
import { useContacts } from "@/hooks/useContacts";
import { useMobileNav } from "@/hooks/useMobileNav";
import { useFeed } from "@/hooks/useFeed";
import { useProfiles } from "@/hooks/useProfiles";
import { useChatMessagesRealtime } from "@/hooks/useChat";
import { useVisualViewportLayout } from "@/hooks/useMobileKeyboardInset";
import { useAutoResizeTextarea } from "@/hooks/useAutoResizeTextarea";
import { usePreventBodyScroll, isOnline, scrollComposerIntoView, persistFeedFilters } from "../utils";
import { useMapPageState } from "./useMapPageState";
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
  const { offsetTop: vvTop, height: vvHeight, keyboardInset } =
    useVisualViewportLayout();
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
    chatList,
    setChatList,
    currentUser,
    setCurrentUser,
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
    (profile: Profile) => {
      if (
        isPaidGateMode() &&
        currentUser &&
        !currentUser.isPro &&
        currentUser.profileId !== profile.id
      ) {
        if (!canUnpaidOpenPinPopup(currentUser.profileId)) {
          setPinLimitOpen(true);
          return;
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
          return;
        }
      }

      setActiveProfileOverlay(profile);
    },
    [currentUser, todayOpenedProfileIds, openPaywallDrawer],
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
        void markProfileViewed(
          profile.id,
          profile.content_updated_at ?? new Date().toISOString(),
        );
      } else {
        setPaymentToast({ message: "Профиль не найден или недоступен" });
      }
    },
    [currentUser?.profileId, profiles, openProfileOverlay, markProfileViewed],
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

  useEffect(() => {
    if (!currentUser?.profileId) return;
    void logDailyActivity();
  }, [currentUser?.profileId]);

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
    const handler = (e: MessageEvent) => {
      const d = e.data as { type?: string; profileId?: string };
      if (d?.type === "ZEIP_OPEN_CHAT" && typeof d.profileId === "string") {
        router.replace(`/map?chat=${encodeURIComponent(d.profileId)}`);
        setChatDeepLinkNonce((n) => n + 1);
      }
    };
    if (typeof navigator !== "undefined" && navigator.serviceWorker) {
      navigator.serviceWorker.addEventListener("message", handler);
      return () => navigator.serviceWorker.removeEventListener("message", handler);
    }
  }, [router]);

  useEffect(() => {
    if (!currentUser) return;
    void getSupportProfileId()
      .then((id) => setSupportProfileId(id))
      .catch(() => {
        /* env или SQL ещё не применены */
      });
  }, [currentUser]);

  // Автооткрытие чата: ?chat=<profiles.id собеседника>
  useEffect(() => {
    if (!currentUser || !profiles.length || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const chatProfileId = params.get("chat");
    if (!chatProfileId) return;
    if (chatProfileId === currentUser.profileId) return;
    const p = profiles.find((pr) => pr.id === chatProfileId);
    if (p) {
      void openChatWithProfile(p);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- открываем только при смене списков/URL-nonce
  }, [currentUser, profiles, chatDeepLinkNonce]);

  // Автооткрытие поп-апа профиля: ?profile=<profiles.id>
  useEffect(() => {
    if (!currentUser || typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const profileId = params.get(PROFILE_MAP_QUERY_PARAM)?.trim();
    if (!profileId) return;

    const clearProfileQueryParam = () => {
      const next = new URLSearchParams(window.location.search);
      if (!next.has(PROFILE_MAP_QUERY_PARAM)) return;
      next.delete(PROFILE_MAP_QUERY_PARAM);
      const qs = next.toString();
      router.replace(qs ? `/map?${qs}` : "/map");
    };

    if (profileId === currentUser.profileId) {
      clearProfileQueryParam();
      return;
    }

    let cancelled = false;

    const openFromDeepLink = async () => {
      let profile = profiles.find((p) => p.id === profileId) ?? null;
      if (!profile) {
        try {
          profile = await fetchProfileForMapById(profileId);
        } catch (e) {
          console.error("Failed to load shared profile", e);
        }
      }
      if (cancelled) return;
      if (profile) {
        openProfileOverlay(profile);
        void markProfileViewed(
          profile.id,
          profile.content_updated_at ?? new Date().toISOString(),
        );
      } else {
        setPaymentToast({ message: "Профиль не найден или недоступен" });
      }
      clearProfileQueryParam();
    };

    void openFromDeepLink();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- открываем только при смене списков/URL-nonce
  }, [currentUser, profiles, profileDeepLinkNonce]);

  // Открытие поддержки: ?support=1 (ссылка) или событие zeip:open-support (клик в TopBar на главной)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const clearSupportQuery = () => {
      const next = new URLSearchParams(window.location.search);
      if (!next.has("support")) return;
      next.delete("support");
      const qs = next.toString();
      router.replace(qs ? `/map?${qs}` : "/map");
    };

    const runFromQuery = async () => {
      const params = new URLSearchParams(window.location.search);
      if (params.get("support") !== "1") return;
      await openSupportChat();
      clearSupportQuery();
    };

    const runFromEvent = () => {
      void openSupportChat();
    };

    void runFromQuery();
    window.addEventListener(OPEN_SUPPORT_CHAT_EVENT, runFromEvent);
    return () => {
      window.removeEventListener(OPEN_SUPPORT_CHAT_EVENT, runFromEvent);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, supportDeepLinkNonce]);

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

  useChatMessagesRealtime({
    currentUser,
    activeChatId,
    blockedProfileIds,
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
        : profiles;

    return source.filter((p) => {
      if (blockedProfileIds.includes(p.id)) return false;

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
    profiles,
    recommendedProfiles,
    feedFilters,
    contactsOnlyMode,
    contactProfileIds,
    selectedCity,
    blockedProfileIds,
  ]);

  const recommendedProfilesAll = useMemo(() => {
    if (!recommendedProfiles) return [];
    return recommendedProfiles.filter(
      (profile) => !blockedProfileIds.includes(profile.id),
    );
  }, [recommendedProfiles, blockedProfileIds]);

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

  const handleToggleRecommended = async () => {
    if (feedFilters.recommendedContacts) {
      setRecommendedProfiles(null);
      setRecommendedNotice(null);
      const next: FeedFilters = { ...feedFilters, recommendedContacts: false };
      setFeedFilters(next);
      persistFeedFilters(next);
      return;
    }

    setRecommendedNotice(null);

    if (!currentUser) {
      setRecommendedNotice(
        "Зарегистрируйтесь, чтобы видеть рекомендованные контакты",
      );
      return;
    }

    const roleTitle = (currentUser.roleTitle ?? "").trim();
    if (!roleTitle) {
      setRecommendedNotice("Заполните профессию в профиле");
      return;
    }

    setRecommendedLoading(true);
    try {
      const rows = await fetchProfilesInterestedIn(roleTitle, {
        excludeProfileId: currentUser.profileId,
      });
      setRecommendedProfiles(rows);
      const next: FeedFilters = { ...feedFilters, recommendedContacts: true };
      setFeedFilters(next);
      persistFeedFilters(next);
    } catch (e) {
      console.error("Failed to load recommended contacts", e);
      setRecommendedNotice("Не удалось загрузить рекомендованные контакты");
    } finally {
      setRecommendedLoading(false);
    }
  };

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

  const handleTogglePost = (id: string) => {
    setExpandedPosts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return new Intl.DateTimeFormat("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone,
    }).format(d);
  };

  const canWriteGeneralChat =
    !!currentUser &&
    userCanWriteGeneralChat(
      currentUser.subscriptionPlan,
      currentUser.isBlocked,
    );

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setCreateError("Нужно войти, чтобы написать пост.");
      return;
    }
    if (currentUser.isBlocked) {
      setCreateError("Ваш аккаунт заблокирован. Публикация недоступна.");
      return;
    }
    if (!userCanWriteGeneralChat(currentUser.subscriptionPlan, currentUser.isBlocked)) {
      setCreateError(
        isPaidGateMode()
          ? "Писать в общий чат доступно на тарифе Pro+. Оформите подписку в разделе «Подписка»."
          : currentUser.subscriptionPlan === "pro"
            ? "На тарифе Pro общий чат доступен только для чтения. Перейдите на Pro+, чтобы писать сообщения."
            : "На тарифе Free общий чат доступен только для чтения. Оформите Pro+, чтобы писать сообщения.",
      );
      return;
    }

    if (!editingPostId) {
      const postsToday = await countTodayChatPosts(currentUser.profileId);
      if (postsToday >= PRO_PLUS_CHAT_LIMIT) {
        setCreateError(
          `Лимит ${PRO_PLUS_CHAT_LIMIT} сообщений в общем чате за сутки исчерпан.`,
        );
        return;
      }
    }
    if (!newPostBody.trim()) {
      setCreateError("Напишите текст сообщения.");
      return;
    }

    setCreating(true);
    setCreateError(null);

    try {
      const maskedBody = maskProfanity(newPostBody.trim()) ?? "";
      const body = maskedBody.slice(0, 1000);
      if (editingPostId) {
        const { data, error } = await updatePostBody(editingPostId, body);
        if (error) throw error;

        setPosts((prev) =>
          prev.map((p) => (p.id === editingPostId ? (data as Post) : p)),
        );
        setEditingPostId(null);
        setNewPostBody("");
      } else {
        const { data, error } = await insertFeedPost({
          authorId: currentUser.profileId,
          body,
          city: selectedCity,
        });
        if (error) throw error;

        setPosts((prev) => {
          const next = [data as Post, ...prev];
          return next.slice(0, 20);
        });
        setNewPostBody("");
      }
    } catch (err: any) {
      setCreateError(err.message ?? "Не удалось отправить сообщение.");
    } finally {
      setCreating(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!currentUser || currentUser.isBlocked) return;
    if (deletingPostId) return;
    if (!window.confirm("Удалить сообщение из общего чата?")) return;

    setDeletingPostId(postId);
    setCreateError(null);
    try {
      const { error } = await deletePost(postId);
      if (error) throw error;
      setPosts((prev) => {
        const next = prev.filter((p) => p.id !== postId);
        postsFingerprintRef.current = next.map((p) => p.id).join("|");
        return next;
      });
      setCommentsByPostId((prev) => {
        if (!(postId in prev)) return prev;
        const next = { ...prev };
        delete next[postId];
        return next;
      });
      if (editingPostId === postId) {
        setEditingPostId(null);
        setNewPostBody("");
      }
    } catch (err: unknown) {
      setCreateError(
        getErrorMessage(err, "Не удалось удалить сообщение."),
      );
    } finally {
      setDeletingPostId(null);
    }
  };

  const handleSubmitComment = async (postId: string, body: string) => {
    if (!currentUser || currentUser.isBlocked) return;
    const masked = (maskProfanity(body.trim()) ?? "").slice(0, 1000);
    if (!masked) {
      throw new Error("Пустой текст.");
    }
    const { data, error } = await insertPostComment({
      postId,
      authorId: currentUser.profileId,
      body: masked,
    });
    if (error) throw error;
    if (data) {
      setCommentsByPostId((prev) => ({
        ...prev,
        [postId]: [...(prev[postId] ?? []), data as PostCommentRow],
      }));
    }
  };

  const openSupportChat = async () => {
    resetSupportComposer();
    setChatError(null);
    setChatLoading(true);
    setEditingMessageId(null);
    setDeletingMessageId(null);
    setChatInput("");

    const envId = getSupportProfileIdFromEnv();
    const supportStub: Profile = {
      id: envId ?? SUPPORT_STUB_PROFILE.id,
      full_name: SUPPORT_STUB_PROFILE.full_name,
      city: null,
      rating_avg: null,
      rating_count: null,
    };
    setActiveChatUser(supportStub);
    if (envId) setSupportProfileId(envId);

    try {
      if (!currentUser) {
        setActiveChatId(null);
        setChatMessages([]);
        setActiveChatIsClosed(false);
        return;
      }

      const envSupportId = getSupportProfileIdFromEnv();
      const profile: Profile = envSupportId
        ? {
            id: envSupportId,
            full_name: "Поддержка",
            city: null,
            rating_avg: null,
            rating_count: null,
          }
        : await fetchSupportProfile();
      setSupportProfileId(profile.id);
      setActiveChatUser(profile);

      const chatId = await openOrEnsurePrivateChat(
        currentUser.profileId,
        profile.id,
      );
      setActiveChatId(chatId);
      chatMembershipRef.current.add(chatId);

      setChatList((prev) => {
        const exists = prev.some((x) => x.chatId === chatId);
        if (exists) return prev;
        return [
          {
            chatId,
            profile,
            lastMessageAt: null,
            lastMessagePreview: null,
          },
          ...prev,
        ];
      });

      let closed = false;
      try {
        closed = await isChatClosed(chatId);
      } catch {
        closed = false;
      }
      setActiveChatIsClosed(closed);

      const normalized = await fetchRecentMessages(chatId);
      setChatMessages(normalized);
      setUnreadByUser((prev) => ({ ...prev, [profile.id]: 0 }));
      void markChatAsRead(chatId, currentUser.profileId);
    } catch (err: unknown) {
      setChatError(
        getErrorMessage(err, "Не удалось открыть поддержку."),
      );
    } finally {
      setChatLoading(false);
    }
  };

  const openChatWithProfile = async (profile: Profile) => {
    if (!currentUser) {
      setChatError("Нужно войти, чтобы отправлять сообщения.");
      return;
    }

    if (profile.id === currentUser.profileId) {
      setChatError("Нельзя написать самому себе.");
      return;
    }

    setActiveChatUser(profile);
    setChatError(null);
    setChatLoading(true);
    resetSupportComposer();

    try {
      const sid =
        supportProfileId ?? getSupportProfileIdFromEnv() ?? null;
      const isSupportPeer = sid != null && profile.id === sid;

      if (isPaidGateMode() && !currentUser.isPro && !isSupportPeer) {
        openPaywallDrawer({
          intent: "dm",
          profileId: profile.id,
          profileName: profile.full_name,
          profileRole: profile.role_title ?? profile.city,
        });
        setChatLoading(false);
        return;
      }

      if (
        !isPaidGateMode() &&
        !canSendDirectMessages(currentUser.subscriptionPlan) &&
        !isSupportPeer
      ) {
        openPaywallDrawer({
          intent: "dm",
          profileId: profile.id,
          profileName: profile.full_name,
          profileRole: profile.role_title ?? profile.city,
        });
        setChatLoading(false);
        return;
      }

      if (!isSupportPeer) {
        const limit = getDmPartnersDailyLimit(currentUser.subscriptionPlan);
        const partnersToday = await getUniqueChatPartnersToday(
          currentUser.profileId,
        );
        if (
          !partnersToday.has(profile.id) &&
          partnersToday.size >= limit
        ) {
          setChatError(
            `Лимит ${limit} уникальных собеседников в сутки исчерпан.${
              currentUser.subscriptionPlan === "pro"
                ? " Перейдите на Pro+ для лимита 30."
                : ""
            }`.trim(),
          );
          setChatLoading(false);
          return;
        }
      }

      const chatId = await openOrEnsurePrivateChat(
        currentUser.profileId,
        profile.id,
      );

      setActiveChatId(chatId);
      chatMembershipRef.current.add(chatId);

      if (isSupportPeer) {
        setActiveChatIsClosed(await isChatClosed(chatId));
      } else {
        setActiveChatIsClosed(false);
      }

      // Гарантируем, что чат есть в списке (важно для UI поп-апа и сортировки)
      setChatList((prev) => {
        const exists = prev.some((x) => x.chatId === chatId);
        if (exists) return prev;
        const item: ChatListItem = {
          chatId,
          profile,
          lastMessageAt: null,
          lastMessagePreview: null,
        };
        return [item, ...prev];
      });

      const excludeSenderIds = blockedProfileIds.includes(profile.id)
        ? [profile.id]
        : undefined;
      const normalized = await fetchRecentMessages(chatId, {
        excludeSenderIds,
      });

      setChatMessages(normalized);
      setEditingMessageId(null);
      setChatInput("");
      setUnreadByUser((prev) => ({ ...prev, [profile.id]: 0 }));
      void markChatAsRead(chatId, currentUser.profileId);
    } catch (err: unknown) {
      setChatError(getChatErrorMessage(err, "Не удалось открыть диалог."));
    } finally {
      setChatLoading(false);
    }
  };

  const handleWriteToProfile = async (profile: Profile) => {
    setActiveProfileOverlay(null);

    if (!currentUser) {
      router.push(
        `/auth?redirect=${encodeURIComponent(`/map?chat=${profile.id}`)}`,
      );
      return;
    }

    if (isPaidGateMode() && !currentUser.isPro && !isSupportProfile(profile.id)) {
      openPaywallDrawer({
        intent: "dm",
        profileId: profile.id,
        profileName: profile.full_name,
        profileRole: profile.role_title ?? profile.city,
      });
      return;
    }

    if (
      !isPaidGateMode() &&
      !canSendDirectMessages(currentUser.subscriptionPlan) &&
      !isSupportProfile(profile.id)
    ) {
      openPaywallDrawer({
        intent: "dm",
        profileId: profile.id,
        profileName: profile.full_name,
        profileRole: profile.role_title ?? profile.city,
      });
      return;
    }

    suppressChatOutsideCloseUntilRef.current = Date.now() + 400;
    await openChatWithProfile(profile);
    setMobileTab("my-chats");
  };

  const openChatFromList = async (item: ChatListItem) => {
    await openChatWithProfile(item.profile);
    setUnreadByUser((prev) => ({ ...prev, [item.profile.id]: 0 }));
    setChatList((prev) => {
      const idx = prev.findIndex((x) => x.chatId === item.chatId);
      if (idx < 0) return prev;
      const next = [...prev];
      const moved = next[idx];
      next.splice(idx, 1);
      return [moved, ...next];
    });
  };

  const handleSendSupportAppeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !activeChatId || !isSupportChat) return;
    if (currentUser.isBlocked) {
      setChatError("Ваш аккаунт заблокирован. Отправка сообщений недоступна.");
      return;
    }

    const subject = supportSubject.trim();
    const description = supportDescription.trim();
    const fieldErrors: { subject?: string; description?: string } = {};
    if (!subject) {
      fieldErrors.subject = "Укажите тему обращения.";
    }
    if (!description) {
      fieldErrors.description = "Укажите описание проблемы.";
    }
    setSupportFieldErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) {
      setChatError("Заполните тему и описание, чтобы отправить обращение.");
      return;
    }

    setChatSending(true);
    setChatError(null);

    try {
      const content = formatAppealMessage(subject, description);
      const { data, error } = await insertMessage({
        chatId: activeChatId,
        senderId: currentUser.profileId,
        content,
      });
      if (error) throw error;

      await reopenChat(activeChatId);
      setActiveChatIsClosed(false);
      setChatMessages((prev) => [...prev, data as ChatMessage]);
      resetSupportComposer();

      const preview = formatChatListPreview(content);
      setChatList((prev) => {
        const idx = prev.findIndex((x) => x.chatId === activeChatId);
        if (idx < 0) return prev;
        const next = [...prev];
        const item = {
          ...next[idx],
          lastMessageAt: (data as ChatMessage).created_at,
          lastMessagePreview: preview,
        };
        next.splice(idx, 1);
        return [item, ...next];
      });
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Не удалось отправить обращение.";
      setChatError(msg);
    } finally {
      setChatSending(false);
    }
  };

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (showSupportAppealForm) return;
    if (!currentUser || !activeChatId || !chatInput.trim()) return;
    if (currentUser.isBlocked) {
      setChatError("Ваш аккаунт заблокирован. Отправка сообщений недоступна.");
      return;
    }
    if (!profileReadyForMessaging) {
      setChatError(
        "Заполните город и профессию в профиле, чтобы отправлять сообщения.",
      );
      return;
    }

    setChatSending(true);
    setChatError(null);

    try {
      // Personal messages: do not mask profanity (per product rule)
      const content = chatInput.trim().slice(0, 1000);

      if (editingMessageId) {
        const { data, error } = await updateMessageContent(
          editingMessageId,
          content,
        );
        if (error) throw error;

        setChatMessages((prev) =>
          prev.map((m) => (m.id === editingMessageId ? (data as ChatMessage) : m)),
        );
        setEditingMessageId(null);
        setChatInput("");

        // Если редактировали последнее сообщение — обновим превью в списке
        setChatList((prev) => {
          if (!activeChatId) return prev;
          const idx = prev.findIndex((x) => x.chatId === activeChatId);
          if (idx < 0) return prev;
          const next = [...prev];
          const item = {
            ...next[idx],
            lastMessagePreview: content,
          };
          next[idx] = item;
          return next;
        });
      } else {
        const { data, error } = await insertMessage({
          chatId: activeChatId,
          senderId: currentUser.profileId,
          content,
        });
        if (error) throw error;

        setChatMessages((prev) => [...prev, data as ChatMessage]);
        setChatInput("");
        notifyUsefulContactsChanged();

        // Поднимаем чат вверх в списке по отправке
        setChatList((prev) => {
          if (!activeChatId) return prev;
          const idx = prev.findIndex((x) => x.chatId === activeChatId);
          if (idx < 0) return prev;
          const next = [...prev];
          const item = {
            ...next[idx],
            lastMessageAt: (data as any).created_at,
            lastMessagePreview: content,
          };
          next.splice(idx, 1);
          return [item, ...next];
        });
      }
    } catch (err: any) {
      setChatError(err.message ?? "Не удалось отправить сообщение.");
    } finally {
      setChatSending(false);
    }
  };

  const handleDeleteChatMessage = async (message: ChatMessage) => {
    if (!currentUser || currentUser.isBlocked) return;
    if (deletingMessageId) return;
    suppressChatOutsideCloseUntilRef.current = Date.now() + 800;
    if (!window.confirm("Удалить сообщение? Собеседник тоже его не увидит.")) {
      return;
    }

    setDeletingMessageId(message.id);
    setChatError(null);
    try {
      const { error } = await deleteMessage(message.id);
      if (error) throw error;

      setChatMessages((prev) => prev.filter((m) => m.id !== message.id));
      if (editingMessageId === message.id) {
        setEditingMessageId(null);
        setChatInput("");
      }

      if (activeChatId) {
        const last = await fetchLatestMessageMeta(activeChatId);
        setChatList((prev) => {
          const idx = prev.findIndex((x) => x.chatId === activeChatId);
          if (idx < 0) return prev;
          const next = [...prev];
          next[idx] = {
            ...next[idx],
            lastMessageAt: last?.at ?? null,
            lastMessagePreview: last?.preview ? last.preview : null,
          };
          return next;
        });
      }
    } catch (err: unknown) {
      setChatError(getErrorMessage(err, "Не удалось удалить сообщение."));
    } finally {
      setDeletingMessageId(null);
    }
  };

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

  useEffect(() => {
    if (typeof window === "undefined" || loading) return;
    if (!isPaidGateMode()) return;

    const { writeProfileId, payment } = parseMapSearchParams(
      window.location.search,
    );

    if (payment === "success" && !paymentSuccessHandledRef.current) {
      paymentSuccessHandledRef.current = true;
      trackPaymentSuccessAha();
      const pending = readPendingPaywallContext();
      const resumeProfileId = writeProfileId ?? pending?.profileId ?? null;
      const resumeProfile = resumeProfileId
        ? profiles.find((p) => p.id === resumeProfileId)
        : null;

      if (
        currentUser?.isPro &&
        pending?.intent === "dm" &&
        resumeProfile
      ) {
        setPaymentToast({
          message: "Подписка активна",
          actionLabel: `Написать ${resumeProfile.full_name ?? "участнику"}`,
          onAction: () => {
            void openChatWithProfile(resumeProfile);
            setMobileTab("my-chats");
          },
        });
      } else if (
        currentUser?.subscriptionPlan === "pro_plus" &&
        pending?.intent === "chat"
      ) {
        setPaymentToast({
          message: "Подписка Pro+ активна — можно писать в общий чат",
        });
      } else if (currentUser?.isPro) {
        setPaymentToast({ message: "Подписка активна" });
      }

      clearPendingPaywallContext();
      clearPaywallQueryParams();
    }

    if (
      writeProfileId &&
      currentUser &&
      !paywallResumeHandledRef.current
    ) {
      paywallResumeHandledRef.current = true;
      const target = profiles.find((p) => p.id === writeProfileId);
      if (
        !canSendDirectMessages(currentUser.subscriptionPlan) &&
        target
      ) {
        openPaywallDrawer({
          intent: "dm",
          profileId: target.id,
          profileName: target.full_name,
          profileRole: target.role_title ?? target.city,
        });
      } else if (canSendDirectMessages(currentUser.subscriptionPlan) && target) {
        void openChatWithProfile(target);
        setMobileTab("my-chats");
      }
      clearPaywallQueryParams();
    }
  }, [
    currentUser,
    loading,
    profiles,
    openPaywallDrawer,
    openChatWithProfile,
    setMobileTab,
  ]);

  useEffect(() => {
    setWelcomeBannerVisible(
      shouldShowWelcomeOnboarding({
        isAuthed: Boolean(currentUser),
        profileCity: currentUser?.city ?? null,
      }),
    );
  }, [currentUser]);

  const showChatsColumn =
    mobileTab === "my-chats" || mobileTab === "contacts";
  const hideMobileMainStack = isMobileLayout && !!activeChatUser;
  return {
    vvTop, vvHeight, keyboardInset, isMobileLayout, mobileTab, hideMobileMainStack,
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
    profiles, chatList, currentUser, loading, error,
    openPaywallDrawer, openProfileOverlay, shareProfileLink, openProfileFromChatLink,
    contactProfileIds, blockedProfileIds, toggleContact, markProfileViewed,
    effectiveViewedProfileIds, selectedCity, setSelectedCity, isRussiaChat,
    profileReadyForMessaging, posts, postsLoading, postsLoadError,
    professionCatalog, industryCatalog, subindustryCatalog,
    isSupportChat, showSupportAppealForm, closeChatWindow,
    mapConfig, timeZone, visiblePosts, searchedVisiblePosts,
    subindustryOptionsForFilters, filteredProfilesForMap,
    showRecommendedEmptyBanner, showRecommendedEmptyRussiaPrompt, showRecommendedEmptyAll,
    handleToggleRecommended, filteredChatList, unreadChatsTotal, toggleBlock,
    handleTogglePost, formatDateTime, canWriteGeneralChat,
    handleCreatePost, handleDeletePost, openSupportChat, openChatWithProfile,
    handleWriteToProfile, openChatFromList, handleSendSupportAppeal,
    handleSendChatMessage, handleDeleteChatMessage, showChatsColumn,
  };
}
