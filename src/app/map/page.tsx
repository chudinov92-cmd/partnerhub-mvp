"use client";

import dynamic from "next/dynamic";
import { markWelcomeOnboardingShown } from "@/lib/welcomeOnboarding";
import { DEFAULT_FEED_FILTERS } from "@/types";
import { PaywallDrawer } from "@/components/PaywallDrawer";
import { PinLimitModal } from "@/components/PinLimitModal";
import { WelcomeBanner } from "@/components/WelcomeBanner";
import { PaymentSuccessToast } from "@/components/PaymentSuccessToast";
import { useMapPageController } from "./hooks/useMapPageController";
import { FeedColumn } from "./components/FeedColumn";
import { MapColumn } from "./components/MapColumn";
import { ChatsColumn } from "./components/ChatsColumn";
import { ChatDialog } from "./components/ChatDialog";
import { persistFeedFilters } from "./utils";
import { isOnline } from "./utils";

const MainMobileNav = dynamic(
  () => import("@/components/MainMobileNav").then((m) => m.MainMobileNav),
  { ssr: false },
);
const ProfilePreviewCard = dynamic(
  () => import("@/components/ProfilePreviewCard").then((m) => m.ProfilePreviewCard),
  { ssr: false },
);

export default function Home() {
  const c = useMapPageController();

  return (
    <div className="zeip-main-stack flex flex-col overflow-hidden bg-gray-100">
      {c.welcomeBannerVisible ? (
        <WelcomeBanner
          onDismiss={() => {
            markWelcomeOnboardingShown();
            c.setWelcomeBannerVisible(false);
          }}
        />
      ) : null}
      <main
        className={`flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row lg:pb-0 ${
          c.isMobileLayout && c.mobileTab === "map"
            ? "pb-0"
            : "pb-[calc(3.5rem+env(safe-area-inset-bottom,0px))]"
        }`}
      >
        <FeedColumn {...c} />
        <MapColumn {...c} />
        <ChatsColumn {...c} />

        {c.activeChatUser ? <ChatDialog {...c} /> : null}

        {c.activeProfileOverlay ? (
          <ProfilePreviewCard
            rootDataAttr
            variant="floating"
            className={c.activeChatUser ? "!z-[1700]" : undefined}
            profile={c.activeProfileOverlay}
            online={isOnline(c.activeProfileOverlay.last_seen_at ?? null)}
            guestLastViewHint={false}
            viewerProfileId={c.currentUser?.profileId ?? null}
            onClose={() => c.setActiveProfileOverlay(null)}
            profileHref={`/profiles/${c.activeProfileOverlay.id}`}
            onShowOnMap={() => {
              c.setFocusedProfileId(c.activeProfileOverlay!.id);
              c.setActiveProfileOverlay(null);
              c.setMobileTab("map");
            }}
            onFilterProfession={(profession) => {
              const next = {
                ...c.feedFilters,
                profession: profession || null,
              };
              c.setFeedFilters(next);
              persistFeedFilters(next);
              c.setActiveProfileOverlay(null);
              c.setMobileTab("map");
            }}
            onWrite={() => {
              void c.handleWriteToProfile(c.activeProfileOverlay!);
            }}
            showContactButton={
              !!c.currentUser?.profileId &&
              c.currentUser.profileId !== c.activeProfileOverlay.id
            }
            isInContacts={c.contactProfileIds.includes(c.activeProfileOverlay.id)}
            onToggleContact={() => c.toggleContact(c.activeProfileOverlay!.id)}
            showBlockButton={
              !!c.currentUser?.profileId &&
              c.currentUser.profileId !== c.activeProfileOverlay.id
            }
            isBlocked={c.blockedProfileIds.includes(c.activeProfileOverlay.id)}
            blockButtonDisabled={
              !!c.blockBusyByProfileId[c.activeProfileOverlay.id]
            }
            onToggleBlock={() => c.toggleBlock(c.activeProfileOverlay!.id)}
            onShare={
              c.currentUser?.profileId &&
              c.currentUser.profileId !== c.activeProfileOverlay.id
                ? () => void c.shareProfileLink(c.activeProfileOverlay!)
                : undefined
            }
          />
        ) : null}
      </main>
      {!c.hideMobileMainStack ? (
        <MainMobileNav
          activeTab={c.mobileTab}
          onTabChange={c.handleMobileTab}
          unreadChatsCount={c.unreadChatsTotal}
        />
      ) : null}
      <PinLimitModal open={c.pinLimitOpen} onClose={() => c.setPinLimitOpen(false)} />
      <PaywallDrawer
        open={c.paywallOpen}
        onClose={c.closePaywallDrawer}
        context={c.paywallContext}
      />
      {c.paymentToast ? (
        <PaymentSuccessToast
          message={c.paymentToast.message}
          actionLabel={c.paymentToast.actionLabel}
          onAction={c.paymentToast.onAction}
          durationMs={c.paymentToast.durationMs}
          showCloseButton={c.paymentToast.showCloseButton}
          onDismiss={() => c.setPaymentToast(null)}
        />
      ) : null}
    </div>
  );
}
