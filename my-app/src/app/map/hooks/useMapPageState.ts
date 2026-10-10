"use client";

import { useRef, useState } from "react";
import { getSupportProfileIdFromEnv } from "@/lib/support";
import type { PaywallIntentContext } from "@/lib/paywallIntent";
import type { ChatMessage, FeedFilters, Profile } from "@/types";
import { DEFAULT_FEED_FILTERS } from "@/types";

export function useMapPageState() {
  const [isMobileLayout, setIsMobileLayout] = useState(false);
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(() => new Set());
  const [feedFiltersOpen, setFeedFiltersOpen] = useState(false);
  const [mapViewMode, setMapViewMode] = useState<"map" | "list">("map");
  const [feedFilters, setFeedFilters] = useState<FeedFilters>(() => DEFAULT_FEED_FILTERS);
  const [recommendedProfiles, setRecommendedProfiles] = useState<Profile[] | null>(null);
  const [recommendedLoading, setRecommendedLoading] = useState(false);
  const [recommendedNotice, setRecommendedNotice] = useState<string | null>(null);
  const [recommendedEmptyDismissed, setRecommendedEmptyDismissed] = useState(false);
  const [newPostBody, setNewPostBody] = useState("");
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [activeChatUser, setActiveChatUser] = useState<Profile | null>(null);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [chatSending, setChatSending] = useState(false);
  const [supportProfileId, setSupportProfileId] = useState<string | null>(
    () => getSupportProfileIdFromEnv(),
  );
  const [supportSubject, setSupportSubject] = useState("");
  const [supportDescription, setSupportDescription] = useState("");
  const [supportFieldErrors, setSupportFieldErrors] = useState<{
    subject?: string;
    description?: string;
  }>({});
  const [activeChatIsClosed, setActiveChatIsClosed] = useState(false);
  const [unreadByUser, setUnreadByUser] = useState<Record<string, number>>({});
  const [generalChatSearch, setGeneralChatSearch] = useState("");
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const chatWindowRef = useRef<HTMLDivElement | null>(null);
  const newPostBodyRef = useRef<HTMLTextAreaElement | null>(null);
  const chatInputRef = useRef<HTMLTextAreaElement | null>(null);
  const supportDescriptionRef = useRef<HTMLTextAreaElement | null>(null);
  const suppressChatOutsideCloseUntilRef = useRef(0);
  const feedScrollRef = useRef<HTMLDivElement | null>(null);
  const [activeProfileOverlay, setActiveProfileOverlay] = useState<Profile | null>(null);
  const [pinLimitOpen, setPinLimitOpen] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [paywallContext, setPaywallContext] = useState<PaywallIntentContext>({
    intent: "dm",
  });
  const [welcomeBannerVisible, setWelcomeBannerVisible] = useState(false);
  const [paymentToast, setPaymentToast] = useState<{
    message: string;
    actionLabel?: string;
    onAction?: () => void;
    durationMs?: number;
    showCloseButton?: boolean;
  } | null>(null);
  const paywallResumeHandledRef = useRef(false);
  const paymentSuccessHandledRef = useRef(false);
  const [focusedProfileId, setFocusedProfileId] = useState<string | null>(null);
  const feedFiltersRef = useRef<HTMLDivElement | null>(null);
  const recommendedEmptyBannerRef = useRef<HTMLDivElement | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const cityInitializedRef = useRef(false);
  const [blockBusyByProfileId, setBlockBusyByProfileId] = useState<
    Record<string, boolean>
  >({});
  const [chatDeepLinkNonce, setChatDeepLinkNonce] = useState(0);
  const [profileDeepLinkNonce, setProfileDeepLinkNonce] = useState(0);
  const [supportDeepLinkNonce, setSupportDeepLinkNonce] = useState(0);

  const hasActiveFeedFilters = Boolean(
    feedFilters.profession ||
      feedFilters.industry ||
      feedFilters.subindustry ||
      feedFilters.current_status ||
      feedFilters.online_status ||
      feedFilters.age_from != null ||
      feedFilters.age_to != null ||
      feedFilters.seeking.length > 0 ||
      feedFilters.recommendedContacts,
  );

  return {
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
  };
}

export type MapPageState = ReturnType<typeof useMapPageState>;
