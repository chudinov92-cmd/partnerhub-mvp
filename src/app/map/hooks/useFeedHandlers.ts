"use client";

import { useCallback } from "react";
import { isPaidGateMode } from "@/lib/accessMode";
import { maskProfanity } from "@/lib/profanity";
import { getErrorMessage } from "@/lib/support";
import {
  countTodayChatPosts,
  deletePost,
  insertPost as insertFeedPost,
  insertPostComment,
  updatePostBody,
} from "@/services/feedService";
import { fetchProfilesInterestedIn } from "@/services/profileService";
import {
  canWriteGeneralChat as userCanWriteGeneralChat,
  PRO_PLUS_CHAT_LIMIT,
} from "@/services/subscriptionService";
import type { CurrentUser, FeedFilters, Post } from "@/types";
import type { PostCommentRow } from "@/components/PostComments";
import { persistFeedFilters } from "../utils";

type FeedHandlerDeps = {
  currentUser: CurrentUser | null;
  feedFilters: FeedFilters;
  setFeedFilters: React.Dispatch<React.SetStateAction<FeedFilters>>;
  setRecommendedProfiles: React.Dispatch<React.SetStateAction<import("@/types").Profile[] | null>>;
  setRecommendedNotice: React.Dispatch<React.SetStateAction<string | null>>;
  setRecommendedLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setExpandedPosts: React.Dispatch<React.SetStateAction<Set<string>>>;
  newPostBody: string;
  setNewPostBody: React.Dispatch<React.SetStateAction<string>>;
  editingPostId: string | null;
  setEditingPostId: React.Dispatch<React.SetStateAction<string | null>>;
  deletingPostId: string | null;
  setDeletingPostId: React.Dispatch<React.SetStateAction<string | null>>;
  creating: boolean;
  setCreating: React.Dispatch<React.SetStateAction<boolean>>;
  setCreateError: React.Dispatch<React.SetStateAction<string | null>>;
  selectedCity: string;
  setPosts: React.Dispatch<React.SetStateAction<Post[]>>;
  setCommentsByPostId: React.Dispatch<
    React.SetStateAction<Record<string, PostCommentRow[]>>
  >;
  postsFingerprintRef: React.MutableRefObject<string>;
  timeZone: string;
};

export function useFeedHandlers(deps: FeedHandlerDeps) {
  const {
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
    setCreating,
    setCreateError,
    selectedCity,
    setPosts,
    setCommentsByPostId,
    postsFingerprintRef,
    timeZone,
  } = deps;

  const handleToggleRecommended = useCallback(async () => {
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
  }, [
    currentUser,
    feedFilters,
    setFeedFilters,
    setRecommendedLoading,
    setRecommendedNotice,
    setRecommendedProfiles,
  ]);

  const handleTogglePost = useCallback(
    (id: string) => {
      setExpandedPosts((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    },
    [setExpandedPosts],
  );

  const formatDateTime = useCallback(
    (iso: string) => {
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
    },
    [timeZone],
  );

  const canWriteGeneralChat =
    !!currentUser &&
    userCanWriteGeneralChat(
      currentUser.subscriptionPlan,
      currentUser.isBlocked,
    );

  const handleCreatePost = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!currentUser) {
        setCreateError("Нужно войти, чтобы написать пост.");
        return;
      }
      if (currentUser.isBlocked) {
        setCreateError("Ваш аккаунт заблокирован. Публикация недоступна.");
        return;
      }
      if (
        !userCanWriteGeneralChat(
          currentUser.subscriptionPlan,
          currentUser.isBlocked,
        )
      ) {
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
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Не удалось отправить сообщение.";
        setCreateError(message);
      } finally {
        setCreating(false);
      }
    },
    [
      currentUser,
      editingPostId,
      newPostBody,
      selectedCity,
      setCreateError,
      setCreating,
      setEditingPostId,
      setNewPostBody,
      setPosts,
    ],
  );

  const handleDeletePost = useCallback(
    async (postId: string) => {
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
        setCreateError(getErrorMessage(err, "Не удалось удалить сообщение."));
      } finally {
        setDeletingPostId(null);
      }
    },
    [
      currentUser,
      deletingPostId,
      editingPostId,
      postsFingerprintRef,
      setCommentsByPostId,
      setCreateError,
      setDeletingPostId,
      setEditingPostId,
      setNewPostBody,
      setPosts,
    ],
  );

  const handleSubmitComment = useCallback(
    async (postId: string, body: string) => {
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
    },
    [currentUser, setCommentsByPostId],
  );

  return {
    handleToggleRecommended,
    handleTogglePost,
    formatDateTime,
    canWriteGeneralChat,
    handleCreatePost,
    handleDeletePost,
    handleSubmitComment,
  };
}
