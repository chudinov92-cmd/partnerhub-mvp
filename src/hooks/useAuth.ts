"use client";

import { useEffect, useRef, useState } from "react";
import { authGetUser, authOnAuthStateChange } from "@/services/authService";
import {
  fetchCurrentUserProfileRow,
  fetchProfilesForMap,
} from "@/services/profileService";
import { loadPrivateChatSidebar } from "@/services/chatService";
import { isActiveProProfile } from "@/services/subscriptionService";
import type { ChatListItem, CurrentUser, Profile } from "@/types";

/**
 * Стартовая загрузка: карта профилей, текущий пользователь, сайдбар личных чатов.
 * blockedProfileIds — на первом маунте обычно []; совпадает с прежним поведением page.tsx.
 */
export function useAuth(blockedProfileIds: readonly string[]) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [chatList, setChatList] = useState<ChatListItem[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const chatMembershipRef = useRef<Set<string>>(new Set());
  const blockedRef = useRef(blockedProfileIds);
  const loadPromiseRef = useRef<Promise<void> | null>(null);
  blockedRef.current = blockedProfileIds;

  useEffect(() => {
    const loadPrivateChatSidebarInBackground = (profileId: string) => {
      loadPrivateChatSidebar(profileId, blockedRef.current as string[])
        .then((sidebar) => {
          chatMembershipRef.current = sidebar.chatMembership;
          setChatList(sidebar.items);
        })
        .catch((err) => {
          console.error("Failed to load chat sidebar", err);
        });
    };

    const load = (): Promise<void> => {
      if (loadPromiseRef.current) {
        return loadPromiseRef.current;
      }

      const promise = (async () => {
        try {
          setError(null);
          setLoading(true);

          const {
            data: { user },
          } = await authGetUser();

          const allProfiles = await fetchProfilesForMap(50);
          setProfiles(allProfiles);
          // Карта и лента не ждут профиль/сайдбар чатов.
          setLoading(false);

          if (user) {
            const profileRow = await fetchCurrentUserProfileRow(user.id);
            if (profileRow) {
              setCurrentUser({
                profileId: profileRow.id,
                fullName: profileRow.full_name,
                city: profileRow.city,
                roleTitle: profileRow.role_title ?? null,
                isBlocked: !!profileRow.is_blocked,
                isPro: isActiveProProfile(profileRow),
              });
              loadPrivateChatSidebarInBackground(profileRow.id);
            } else {
              chatMembershipRef.current = new Set();
              setCurrentUser(null);
              setChatList([]);
            }
          } else {
            chatMembershipRef.current = new Set();
            setCurrentUser(null);
            setChatList([]);
          }
        } catch (err: unknown) {
          const msg =
            err instanceof Error ? err.message : "Не удалось загрузить данные";
          setError(msg);
        } finally {
          setLoading(false);
          loadPromiseRef.current = null;
        }
      })();

      loadPromiseRef.current = promise;
      return promise;
    };

    void load();

    const {
      data: { subscription },
    } = authOnAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setCurrentUser(null);
        setChatList([]);
        chatMembershipRef.current = new Set();
        setProfiles([]);
        setLoading(false);
        loadPromiseRef.current = null;
        return;
      }
      if (event === "TOKEN_REFRESHED") {
        void (async () => {
          const {
            data: { user },
          } = await authGetUser();
          if (!user) return;
          const profileRow = await fetchCurrentUserProfileRow(user.id);
          if (profileRow) {
            setCurrentUser({
              profileId: profileRow.id,
              fullName: profileRow.full_name,
              city: profileRow.city,
              roleTitle: profileRow.role_title ?? null,
              isBlocked: !!profileRow.is_blocked,
              isPro: isActiveProProfile(profileRow),
            });
            loadPrivateChatSidebarInBackground(profileRow.id);
          }
        })();
        return;
      }
      if (event === "SIGNED_IN") {
        void load();
      }
    });

    return () => {
      subscription.unsubscribe();
      loadPromiseRef.current = null;
    };
  }, []);

  return {
    profiles,
    setProfiles,
    chatList,
    setChatList,
    currentUser,
    setCurrentUser,
    loading,
    error,
    chatMembershipRef,
  };
}
