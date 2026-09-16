"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { isPaidGateMode } from "@/lib/accessMode";
import type { PaywallIntentContext } from "@/lib/paywallIntent";
import {
  formatAppealMessage,
  getSupportProfileIdFromEnv,
  getChatErrorMessage,
  getErrorMessage,
  SUPPORT_STUB_PROFILE,
} from "@/lib/support";
import { notifyUsefulContactsChanged } from "@/lib/usefulContactEvents";
import {
  formatChatListPreview,
  openOrEnsurePrivateChat,
  fetchRecentMessages,
  mergeChatMessages,
  updateMessageContent,
  deleteMessage,
  fetchLatestMessageMeta,
  insertMessage,
  getUniqueChatPartnersToday,
  fetchSupportProfile,
  isChatClosed,
  reopenChat,
  markChatAsRead,
} from "@/services/chatService";
import {
  getDmPartnersDailyLimit,
  canSendDirectMessages,
} from "@/services/subscriptionService";
import type { MobileMainTab } from "@/components/MainMobileNav";
import type { ChatListItem, ChatMessage, CurrentUser, Profile } from "@/types";

export type ChatHandlerDeps = {
  router: ReturnType<typeof useRouter>;
  currentUser: CurrentUser | null;
  supportProfileId: string | null;
  setSupportProfileId: React.Dispatch<React.SetStateAction<string | null>>;
  blockedProfileIds: string[];
  activeChatId: string | null;
  chatList: ChatListItem[];
  activeChatUser: Profile | null;
  chatInput: string;
  setChatInput: React.Dispatch<React.SetStateAction<string>>;
  editingMessageId: string | null;
  setEditingMessageId: React.Dispatch<React.SetStateAction<string | null>>;
  deletingMessageId: string | null;
  setDeletingMessageId: React.Dispatch<React.SetStateAction<string | null>>;
  setChatLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setChatError: React.Dispatch<React.SetStateAction<string | null>>;
  setChatSending: React.Dispatch<React.SetStateAction<boolean>>;
  supportSubject: string;
  supportDescription: string;
  setSupportFieldErrors: React.Dispatch<
    React.SetStateAction<{ subject?: string; description?: string }>
  >;
  activeChatIsClosed: boolean;
  setActiveChatIsClosed: React.Dispatch<React.SetStateAction<boolean>>;
  setActiveChatUser: React.Dispatch<React.SetStateAction<Profile | null>>;
  setActiveChatId: React.Dispatch<React.SetStateAction<string | null>>;
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  setChatList: React.Dispatch<React.SetStateAction<ChatListItem[]>>;
  setUnreadByUser: React.Dispatch<
    React.SetStateAction<Record<string, number>>
  >;
  chatMembershipRef: React.MutableRefObject<Set<string>>;
  suppressChatOutsideCloseUntilRef: React.MutableRefObject<number>;
  setActiveProfileOverlay: React.Dispatch<React.SetStateAction<Profile | null>>;
  setMobileTab: (tab: MobileMainTab) => void;
  openPaywallDrawer: (ctx: PaywallIntentContext) => void;
  resetSupportComposer: () => void;
  isSupportProfile: (profileId: string) => boolean;
  isSupportChat: boolean;
  showSupportAppealForm: boolean;
  profileReadyForMessaging: boolean;
};

export function useChatHandlers(deps: ChatHandlerDeps) {
  const {
    router,
    currentUser,
    supportProfileId,
    setSupportProfileId,
    blockedProfileIds,
    activeChatId,
    chatList,
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
  } = deps;

  const chatLoadGenRef = useRef(0);
  const activePeerIdRef = useRef<string | null>(null);
  const chatListRef = useRef(chatList);
  chatListRef.current = chatList;

  const resolveChatIdForPeer = (
    profileId: string,
    opts?: { knownChatId?: string },
  ): string | null => {
    if (opts?.knownChatId) return opts.knownChatId;
    const fromList = chatListRef.current.find((x) => x.profile.id === profileId);
    return fromList?.chatId ?? null;
  };

  const beginChatLoad = () => {
    chatLoadGenRef.current += 1;
    return chatLoadGenRef.current;
  };

  const isChatLoadStale = (gen: number) => chatLoadGenRef.current !== gen;

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

    const gen = beginChatLoad();
    const switchingPeer = activePeerIdRef.current !== supportStub.id;
    if (switchingPeer) {
      setChatMessages([]);
    }
    activePeerIdRef.current = supportStub.id;

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
      if (isChatLoadStale(gen)) return;

      setSupportProfileId(profile.id);
      setActiveChatUser(profile);
      activePeerIdRef.current = profile.id;

      const chatId = await openOrEnsurePrivateChat(
        currentUser.profileId,
        profile.id,
      );
      if (isChatLoadStale(gen)) return;

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
      if (isChatLoadStale(gen)) return;
      setActiveChatIsClosed(closed);

      const normalized = await fetchRecentMessages(chatId);
      if (isChatLoadStale(gen)) return;

      setChatMessages((prev) => mergeChatMessages(prev, normalized));
      setUnreadByUser((prev) => ({ ...prev, [profile.id]: 0 }));
      void markChatAsRead(chatId, currentUser.profileId);
    } catch (err: unknown) {
      if (!isChatLoadStale(gen)) {
        setChatError(getErrorMessage(err, "Не удалось открыть поддержку."));
      }
    } finally {
      if (!isChatLoadStale(gen)) {
        setChatLoading(false);
      }
    }
  };

  const openChatWithProfile = async (
    profile: Profile,
    opts?: { knownChatId?: string },
  ) => {
    if (!currentUser) {
      setChatError("Нужно войти, чтобы отправлять сообщения.");
      return;
    }

    if (profile.id === currentUser.profileId) {
      setChatError("Нельзя написать самому себе.");
      return;
    }

    const gen = beginChatLoad();
    const switchingPeer = activePeerIdRef.current !== profile.id;
    if (switchingPeer) {
      setChatMessages([]);
    }
    activePeerIdRef.current = profile.id;

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
        if (isChatLoadStale(gen)) return;
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

      let chatId =
        resolveChatIdForPeer(profile.id, opts) ??
        (await openOrEnsurePrivateChat(currentUser.profileId, profile.id));

      const listItem = chatListRef.current.find(
        (x) => x.profile.id === profile.id,
      );
      if (
        listItem &&
        listItem.chatId !== chatId &&
        (listItem.lastMessagePreview || listItem.lastMessageAt)
      ) {
        chatId = listItem.chatId;
      }

      if (isChatLoadStale(gen)) return;

      setActiveChatId(chatId);
      chatMembershipRef.current.add(chatId);

      if (isSupportPeer) {
        setActiveChatIsClosed(await isChatClosed(chatId));
      } else {
        setActiveChatIsClosed(false);
      }
      if (isChatLoadStale(gen)) return;

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
      let normalized = await fetchRecentMessages(chatId, {
        excludeSenderIds,
      });
      if (
        normalized.length === 0 &&
        listItem &&
        listItem.chatId !== chatId &&
        listItem.lastMessagePreview
      ) {
        chatId = listItem.chatId;
        setActiveChatId(chatId);
        chatMembershipRef.current.add(chatId);
        normalized = await fetchRecentMessages(chatId, { excludeSenderIds });
      }
      if (isChatLoadStale(gen)) return;

      setChatMessages((prev) => mergeChatMessages(prev, normalized));
      setEditingMessageId(null);
      setChatInput("");
      setUnreadByUser((prev) => ({ ...prev, [profile.id]: 0 }));
      void markChatAsRead(chatId, currentUser.profileId);
    } catch (err: unknown) {
      if (!isChatLoadStale(gen)) {
        setChatError(getChatErrorMessage(err, "Не удалось открыть диалог."));
      }
    } finally {
      if (!isChatLoadStale(gen)) {
        setChatLoading(false);
      }
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
    await openChatWithProfile(item.profile, { knownChatId: item.chatId });
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
      setChatError(getErrorMessage(err, "Не удалось отправить обращение."));
    } finally {
      setChatSending(false);
    }
  };

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (showSupportAppealForm) return;
    if (!currentUser || !chatInput.trim()) return;
    if (!activeChatId) {
      setChatError("Чат ещё не готов. Закройте окно и откройте диалог снова.");
      return;
    }
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

        setChatList((prev) => {
          if (!activeChatId) return prev;
          const idx = prev.findIndex((x) => x.chatId === activeChatId);
          if (idx < 0) return prev;
          const next = [...prev];
          const item = {
            ...next[idx],
            lastMessageAt: (data as ChatMessage).created_at,
            lastMessagePreview: content,
          };
          next.splice(idx, 1);
          return [item, ...next];
        });
      }
    } catch (err: unknown) {
      setChatError(getErrorMessage(err, "Не удалось отправить сообщение."));
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

  return {
    openSupportChat,
    openChatWithProfile,
    handleWriteToProfile,
    openChatFromList,
    handleSendSupportAppeal,
    handleSendChatMessage,
    handleDeleteChatMessage,
  };
}
