"use client";

import type { Dispatch, ReactNode, RefObject, SetStateAction } from "react";
import type { ChatListItem, ChatMessage, Profile } from "../types";
import type { SubscriptionPlan } from "@my-startup/subscription";

/** Узкий срез пользователя — как в PostComments (CurrentUserLite). */
export type CurrentUserLite = {
  profileId: string;
  isBlocked: boolean;
  isPro: boolean;
  subscriptionPlan: SubscriptionPlan;
};

export type SupportFieldErrors = { subject?: string; description?: string };

export type MobileTab = "map" | "feed" | "my-chats" | "contacts";

export type ChatsColumnProps = {
  hideMobileMainStack: boolean;
  showChatsColumn: boolean;
  unreadByUser: Record<string, number>;
  contactsOnlyMode: boolean;
  currentUser: CurrentUserLite | null;
  loading: boolean;
  filteredChatList: ChatListItem[];
  resetContactsMode: () => void;
  setMobileTab: (tab: MobileTab) => void;
  openProfileOverlay: (profile: Profile) => void;
  openChatFromList: (item: ChatListItem) => void | Promise<void>;
  /** Слот баннера (app передаёт <PushOptInBanner hasSession />). */
  renderPushBanner?: () => ReactNode;
};

export type PaywallCtaContext = {
  profileId?: string;
  profileName?: string | null;
  profileRole?: string | null;
};

export type ChatDialogProps = {
  isMobileLayout: boolean;
  // активный чат / собеседник
  activeChatUser: Profile | null;
  isSupportChat: boolean;
  activeChatIsClosed: boolean;
  showSupportAppealForm: boolean;
  // состояние чата
  chatMessages: ChatMessage[];
  chatInput: string;
  setChatInput: (value: string) => void;
  editingMessageId: string | null;
  setEditingMessageId: (id: string | null) => void;
  deletingMessageId: string | null;
  chatLoading: boolean;
  chatError: string | null;
  chatSending: boolean;
  // форма обращения
  supportSubject: string;
  setSupportSubject: (value: string) => void;
  supportDescription: string;
  setSupportDescription: (value: string) => void;
  supportFieldErrors: SupportFieldErrors;
  setSupportFieldErrors: Dispatch<SetStateAction<SupportFieldErrors>>;
  // рефы
  chatScrollRef: RefObject<HTMLDivElement | null>;
  chatWindowRef: RefObject<HTMLDivElement | null>;
  chatInputRef: RefObject<HTMLTextAreaElement | null>;
  supportDescriptionRef: RefObject<HTMLTextAreaElement | null>;
  // профили/пользователь
  profiles: Profile[];
  currentUser: CurrentUserLite | null;
  profileReadyForMessaging: boolean;
  canSendDirectMessagesToPeer: boolean;
  // колбэки
  openProfileOverlay: (profile: Profile) => void;
  openProfileFromChatLink: (profileId: string) => void | Promise<void>;
  closeChatWindow: () => void;
  handleSendSupportAppeal: (e: React.FormEvent) => void | Promise<void>;
  handleSendChatMessage: (e: React.FormEvent) => void | Promise<void>;
  handleDeleteChatMessage: (message: ChatMessage) => void | Promise<void>;
  formatDateTime: (iso: string) => string;
  // app-инъекция: пайволл CTA (savePendingPaywallContext + трекинг)
  onPaywallCta?: (ctx: PaywallCtaContext) => void;
};