"use client";

import { useEffect } from "react";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { isPaidGateMode } from "@/lib/accessMode";
import { PROFILE_MAP_QUERY_PARAM } from "@/lib/profileShare";
import {
  clearPaywallQueryParams,
  clearPendingPaywallContext,
  parseMapSearchParams,
  readPendingPaywallContext,
} from "@/lib/paywallIntent";
import { OPEN_SUPPORT_CHAT_EVENT } from "@/lib/support";
import {
  markWelcomeOnboardingShown,
  shouldShowWelcomeOnboarding,
} from "@/lib/welcomeOnboarding";
import {
  trackPaymentSuccessAha,
} from "@/lib/paywallAnalytics";
import { canSendDirectMessages } from "@/services/subscriptionService";
import { fetchProfileForMapById } from "@/services/profileService";
import type { MobileMainTab } from "@/components/MainMobileNav";
import type { Profile, CurrentUser, ChatListItem } from "@/types";
import type { PaywallIntentContext } from "@/lib/paywallIntent";

export type MapEffectsDeps = {
  router: AppRouterInstance;
  currentUser: CurrentUser | null;
  loading: boolean;
  profiles: Profile[];
  chatList: ChatListItem[];
  chatDeepLinkNonce: number;
  profileDeepLinkNonce: number;
  supportDeepLinkNonce: number;
  setChatDeepLinkNonce: React.Dispatch<React.SetStateAction<number>>;
  openChatWithProfile: (
    profile: Profile,
    opts?: { knownChatId?: string },
  ) => Promise<void>;
  openSupportChat: () => Promise<void>;
  openProfileOverlay: (profile: Profile) => boolean;
  setPaymentToast: React.Dispatch<
    React.SetStateAction<{
      message: string;
      actionLabel?: string;
      onAction?: () => void;
      durationMs?: number;
      showCloseButton?: boolean;
    } | null>
  >;
  paywallResumeHandledRef: React.MutableRefObject<boolean>;
  paymentSuccessHandledRef: React.MutableRefObject<boolean>;
  openPaywallDrawer: (ctx: PaywallIntentContext) => void;
  setMobileTab: (tab: MobileMainTab) => void;
  setWelcomeBannerVisible: React.Dispatch<React.SetStateAction<boolean>>;
};

/** Deep-links, paywall resume, SW messages, welcome banner. */
export function useMapEffects(deps: MapEffectsDeps) {
  const {
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
  } = deps;

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
  }, [router, setChatDeepLinkNonce]);

  useEffect(() => {
    if (!currentUser || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const chatProfileId = params.get("chat");
    if (!chatProfileId) return;
    if (chatProfileId === currentUser.profileId) return;

    const clearChatQueryParam = () => {
      const next = new URLSearchParams(window.location.search);
      if (!next.has("chat")) return;
      next.delete("chat");
      const qs = next.toString();
      router.replace(qs ? `/map?${qs}` : "/map");
    };

    let cancelled = false;

    const openFromDeepLink = async () => {
      const listItem = chatList.find((x) => x.profile.id === chatProfileId);
      let profile =
        profiles.find((pr) => pr.id === chatProfileId) ??
        listItem?.profile ??
        null;
      if (!profile) {
        try {
          profile = await fetchProfileForMapById(chatProfileId);
        } catch (e) {
          console.error("Failed to load chat profile", e);
        }
      }
      if (cancelled) return;
      if (profile) {
        await openChatWithProfile(
          profile,
          listItem?.chatId ? { knownChatId: listItem.chatId } : undefined,
        );
        setMobileTab("my-chats");
      } else {
        setPaymentToast({ message: "Профиль не найден или недоступен" });
      }
      clearChatQueryParam();
    };

    void openFromDeepLink();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- nonce-driven deeplink
  }, [currentUser, profiles, chatList, chatDeepLinkNonce]);

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
      } else {
        setPaymentToast({ message: "Профиль не найден или недоступен" });
      }
      clearProfileQueryParam();
    };

    void openFromDeepLink();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- nonce-driven deeplink
  }, [currentUser, profiles, profileDeepLinkNonce]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- support deeplink nonce
  }, [currentUser, supportDeepLinkNonce]);

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
    setPaymentToast,
    paywallResumeHandledRef,
    paymentSuccessHandledRef,
  ]);

  useEffect(() => {
    setWelcomeBannerVisible(
      shouldShowWelcomeOnboarding({
        isAuthed: Boolean(currentUser),
        profileCity: currentUser?.city ?? null,
      }),
    );
  }, [currentUser, setWelcomeBannerVisible]);
}
