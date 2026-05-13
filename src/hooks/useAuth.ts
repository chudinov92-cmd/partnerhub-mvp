"use client";

import { useEffect, useRef, useState } from "react";
import { authGetUser } from "@/services/authService";
import {
  fetchCurrentUserProfileRow,
  fetchProfilesForMap,
} from "@/services/profileService";
import { loadPrivateChatSidebar } from "@/services/chatService";
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
  blockedRef.current = blockedProfileIds;

  useEffect(() => {
    const load = async () => {
      try {
        setError(null);
        setLoading(true);

        const {
          data: { user },
        } = await authGetUser();

        const allProfiles = await fetchProfilesForMap(50);
        setProfiles(allProfiles);

        if (user) {
          const profileRow = await fetchCurrentUserProfileRow(user.id);
          if (profileRow) {
            setCurrentUser({
              profileId: profileRow.id,
              fullName: profileRow.full_name,
              city: profileRow.city,
              isBlocked: !!profileRow.is_blocked,
            });

            const sidebar = await loadPrivateChatSidebar(
              profileRow.id,
              blockedRef.current as string[],
            );
            chatMembershipRef.current = sidebar.chatMembership;
            setChatList(sidebar.items);
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
        const msg = err instanceof Error ? err.message : "Не удалось загрузить данные";
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    void load();
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
