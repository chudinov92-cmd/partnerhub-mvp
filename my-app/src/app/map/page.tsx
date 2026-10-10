"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { markWelcomeOnboardingShown } from "@/lib/welcomeOnboarding";
import { PaywallDrawer } from "@/components/PaywallDrawer";
import { PinLimitModal } from "@/components/PinLimitModal";
import { WelcomeBanner } from "@/components/WelcomeBanner";
import { PaymentSuccessToast } from "@/components/PaymentSuccessToast";
import { ModerationPurgeDialog } from "@/components/admin/ModerationPurgeDialog";
import { PushOptInBanner } from "@/components/PushOptInBanner";
import { useIsSuperAdmin } from "@/hooks/useIsSuperAdmin";
import { useMapPageController } from "./hooks/useMapPageController";
import { FeedColumn } from "./components/FeedColumn";
import { MapColumn } from "./components/MapColumn";
import { ChatsColumn, ChatDialog, type PaywallCtaContext } from "@my-startup/chat";
import { persistFeedFilters, isOnline } from "./utils";
import { isPaidGateMode } from "@my-startup/auth";
import { canSendDirectMessages } from "@my-startup/subscription";
import {
  trackCheckoutStarted,
  trackPaywallCtaBuy,
} from "@my-startup/analytics";
import { savePendingPaywallContext } from "@/lib/paywallIntent";

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
  const router = useRouter();
  const { isSuperAdmin } = useIsSuperAdmin();
  const [moderationOpen, setModerationOpen] = useState(false);
  const [moderationQuery, setModerationQuery] = useState("");

  const canModerateOverlay =
    isSuperAdmin &&
    !!c.currentUser?.profileId &&
    !!c.activeProfileOverlay &&
    c.currentUser.profileId !== c.activeProfileOverlay.id;

  const canSendDirectMessagesToPeer =
    c.isSupportChat ||
    (c.currentUser
      ? isPaidGateMode()
        ? c.currentUser.isPro
        : canSendDirectMessages(c.currentUser.subscriptionPlan)
      : false);

  const handlePaywallCta = (ctx: PaywallCtaContext) => {
    savePendingPaywallContext({
      intent: "dm",
      profileId: ctx.profileId,
      profileName: ctx.profileName,
      profileRole: ctx.profileRole,
    });
    trackPaywallCtaBuy("dm");
    trackCheckoutStarted();
  };

  const chatsColumnProps = {
    hideMobileMainStack: c.hideMobileMainStack,
    showChatsColumn: c.showChatsColumn,
    unreadByUser: c.unreadByUser,
    contactsOnlyMode: c.contactsOnlyMode,
    currentUser: c.currentUser,
    loading: c.loading,
    filteredChatList: c.filteredChatList,
    resetContactsMode: c.resetContactsMode,
    setMobileTab: (tab: string) => c.setMobileTab(tab as any),
    openProfileOverlay: c.openProfileOverlay,
    openChatFromList: c.openChatFromList,
    renderPushBanner: () => <PushOptInBanner hasSession />,
  };

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
        <ChatsColumn {...chatsColumnProps} />

        {c.activeChatUser && c.currentUser ? <ChatDialog
          isMobileLayout={c.isMobileLayout}
          activeChatUser={c.activeChatUser}
          isSupportChat={c.isSupportChat}
          activeChatIsClosed={c.activeChatIsClosed}
          showSupportAppealForm={c.showSupportAppealForm}
          chatMessages={c.chatMessages}
          chatInput={c.chatInput}
          setChatInput={c.setChatInput}
          editingMessageId={c.editingMessageId}
          setEditingMessageId={c.setEditingMessageId}
          deletingMessageId={c.deletingMessageId}
          chatLoading={c.chatLoading}
          chatError={c.chatError}
          chatSending={c.chatSending}
          supportSubject={c.supportSubject}
          setSupportSubject={c.setSupportSubject}
          supportDescription={c.supportDescription}
          setSupportDescription={c.setSupportDescription}
          supportFieldErrors={c.supportFieldErrors}
          setSupportFieldErrors={c.setSupportFieldErrors}
          chatScrollRef={c.chatScrollRef}
          chatWindowRef={c.chatWindowRef}
          chatInputRef={c.chatInputRef}
          supportDescriptionRef={c.supportDescriptionRef}
          profiles={c.profiles}
          currentUser={c.currentUser}
          profileReadyForMessaging={c.profileReadyForMessaging}
          canSendDirectMessagesToPeer={canSendDirectMessagesToPeer}
          openProfileOverlay={c.openProfileOverlay}
          openProfileFromChatLink={c.openProfileFromChatLink}
          closeChatWindow={c.closeChatWindow}
          handleSendSupportAppeal={c.handleSendSupportAppeal}
          handleSendChatMessage={c.handleSendChatMessage}
          handleDeleteChatMessage={c.handleDeleteChatMessage}
          formatDateTime={c.formatDateTime}
          onPaywallCta={handlePaywallCta}
        /> : null}

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
              c.currentUser?.profileId
                ? () => void c.shareProfileLink(c.activeProfileOverlay!)
                : undefined
            }
            onModerate={
              canModerateOverlay
                ? () => {
                    setModerationQuery(c.activeProfileOverlay!.id);
                    setModerationOpen(true);
                  }
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

      <ModerationPurgeDialog
        open={moderationOpen}
        initialQuery={moderationQuery}
        onClose={() => setModerationOpen(false)}
        onSuccess={() => {
          c.setActiveProfileOverlay(null);
          setModerationOpen(false);
          router.refresh();
        }}
      />
    </div>
  );
}
