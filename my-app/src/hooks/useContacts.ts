"use client";

import { useCallback, useEffect, useState } from "react";
import type { CurrentUser, Profile } from "@/types";
import { FREE_FAVORITES_LIMIT } from "@/lib/subscriptionPlans";
import {
  deleteContact,
  fetchBlockedProfileIds,
  fetchContactProfiles,
  fetchTodayOpenedProfileIds,
  fetchViewedProfileStates,
  insertContact,
  upsertProfileView,
} from "@/services/contactService";
import { notifyProfileContactsChanged } from "@/lib/contactEvents";

/** Контакты, просмотры, список блокировок (мутации блока остаются в page — там side-effects чата). */
export function useContacts(
  currentUser: CurrentUser | null,
  onFavoritesLimit?: () => void,
) {
  const [contactProfileIds, setContactProfileIds] = useState<string[]>([]);
  const [contactProfiles, setContactProfiles] = useState<Profile[]>([]);
  const [viewedProfileStates, setViewedProfileStates] = useState<
    Record<string, string>
  >({});
  const [blockedProfileIds, setBlockedProfileIds] = useState<string[]>([]);
  const [todayOpenedProfileIds, setTodayOpenedProfileIds] = useState<string[]>(
    [],
  );

  const profileId = currentUser?.profileId;

  const reloadContacts = useCallback(async () => {
    if (!profileId) {
      setContactProfileIds([]);
      setContactProfiles([]);
      return;
    }

    const profiles = await fetchContactProfiles(profileId);
    setContactProfiles(profiles);
    setContactProfileIds(profiles.map((profile) => profile.id));
  }, [profileId]);

  useEffect(() => {
    let alive = true;

    reloadContacts().catch((error) => {
      if (!alive) return;
      console.error("Failed to load contacts", error);
      setContactProfiles([]);
    });

    return () => {
      alive = false;
    };
  }, [reloadContacts]);

  useEffect(() => {
    if (!profileId) {
      setViewedProfileStates({});
      return;
    }
    let alive = true;
    fetchViewedProfileStates(profileId)
      .then((states) => {
        if (!alive) return;
        setViewedProfileStates(states);
      })
      .catch((error) => {
        if (!alive) return;
        console.error("Failed to load views", error);
        setViewedProfileStates({});
      });
    return () => {
      alive = false;
    };
  }, [profileId]);

  useEffect(() => {
    if (!profileId || currentUser?.subscriptionPlan !== "free") {
      setTodayOpenedProfileIds([]);
      return;
    }
    let alive = true;
    fetchTodayOpenedProfileIds(profileId)
      .then((ids) => {
        if (!alive) return;
        setTodayOpenedProfileIds(ids);
      })
      .catch((error) => {
        if (!alive) return;
        console.error("Failed to load today profile views", error);
        setTodayOpenedProfileIds([]);
      });
    return () => {
      alive = false;
    };
  }, [profileId, currentUser?.subscriptionPlan]);

  useEffect(() => {
    if (!profileId) {
      setBlockedProfileIds([]);
      return;
    }
    let alive = true;
    fetchBlockedProfileIds(profileId)
      .then((ids) => {
        if (!alive) return;
        setBlockedProfileIds(ids);
      })
      .catch((error) => {
        if (!alive) return;
        console.error("Failed to load blocks", error);
        setBlockedProfileIds([]);
      });
    return () => {
      alive = false;
    };
  }, [profileId]);

  const toggleContact = async (pid: string) => {
    if (!profileId || !currentUser) return;
    if (pid === profileId) return;

    const isIn = contactProfileIds.includes(pid);

    if (
      !isIn &&
      currentUser.subscriptionPlan === "free" &&
      contactProfileIds.length >= FREE_FAVORITES_LIMIT
    ) {
      onFavoritesLimit?.();
      return;
    }

    setContactProfileIds((prev) =>
      isIn ? prev.filter((x) => x !== pid) : [...prev, pid],
    );
    if (isIn) {
      setContactProfiles((prev) => prev.filter((profile) => profile.id !== pid));
    }

    try {
      if (isIn) {
        await deleteContact(profileId, pid);
      } else {
        await insertContact(profileId, pid, {
          subscriptionPlan: currentUser.subscriptionPlan,
          currentCount: contactProfileIds.length,
        });
      }
      notifyProfileContactsChanged();
      if (!isIn) {
        await reloadContacts();
      }
    } catch (e) {
      console.error("Failed to toggle contact", e);
      setContactProfileIds((prev) =>
        isIn ? [...prev, pid] : prev.filter((x) => x !== pid),
      );
      await reloadContacts();
      notifyProfileContactsChanged();
    }
  };

  const markProfileViewed = async (pid: string, contentUpdatedAt: string) => {
    if (!profileId) return;
    if (pid === profileId) return;

    const previous = viewedProfileStates[pid];
    setViewedProfileStates((prev) => ({
      ...prev,
      [pid]: contentUpdatedAt,
    }));

    if (
      currentUser?.subscriptionPlan === "free" &&
      !todayOpenedProfileIds.includes(pid)
    ) {
      setTodayOpenedProfileIds((prev) => [...prev, pid]);
    }

    try {
      await upsertProfileView(profileId, pid, contentUpdatedAt);
    } catch (e) {
      console.error("Failed to mark profile viewed", e);
      setViewedProfileStates((prev) => {
        const next = { ...prev };
        if (previous != null) {
          next[pid] = previous;
        } else {
          delete next[pid];
        }
        return next;
      });
      if (
        currentUser?.subscriptionPlan === "free" &&
        !todayOpenedProfileIds.includes(pid)
      ) {
        setTodayOpenedProfileIds((prev) => prev.filter((id) => id !== pid));
      }
    }
  };

  return {
    contactProfileIds,
    contactProfiles,
    setContactProfileIds,
    viewedProfileStates,
    blockedProfileIds,
    setBlockedProfileIds,
    todayOpenedProfileIds,
    toggleContact,
    markProfileViewed,
  };
};
