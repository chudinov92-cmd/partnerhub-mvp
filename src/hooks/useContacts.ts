"use client";

import { useEffect, useState } from "react";
import type { CurrentUser } from "@/types";
import {
  deleteContact,
  fetchBlockedProfileIds,
  fetchContactProfileIds,
  fetchViewedProfileIds,
  insertContact,
  insertProfileView,
} from "@/services/contactService";
import { notifyProfileContactsChanged } from "@/lib/contactEvents";

/** Контакты, просмотры, список блокировок (мутации блока остаются в page — там side-effects чата). */
export function useContacts(currentUser: CurrentUser | null) {
  const [contactProfileIds, setContactProfileIds] = useState<string[]>([]);
  const [viewedProfileIds, setViewedProfileIds] = useState<string[]>([]);
  const [blockedProfileIds, setBlockedProfileIds] = useState<string[]>([]);

  const profileId = currentUser?.profileId;

  useEffect(() => {
    if (!profileId) {
      setContactProfileIds([]);
      return;
    }
    let alive = true;
    fetchContactProfileIds(profileId)
      .then((ids) => {
        if (!alive) return;
        setContactProfileIds(ids);
      })
      .catch((error) => {
        if (!alive) return;
        console.error("Failed to load contacts", error);
        setContactProfileIds([]);
      });
    return () => {
      alive = false;
    };
  }, [profileId]);

  useEffect(() => {
    if (!profileId) {
      setViewedProfileIds([]);
      return;
    }
    let alive = true;
    fetchViewedProfileIds(profileId)
      .then((ids) => {
        if (!alive) return;
        setViewedProfileIds(ids);
      })
      .catch((error) => {
        if (!alive) return;
        console.error("Failed to load views", error);
        setViewedProfileIds([]);
      });
    return () => {
      alive = false;
    };
  }, [profileId]);

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
    if (!profileId) return;
    if (pid === profileId) return;

    const isIn = contactProfileIds.includes(pid);
    setContactProfileIds((prev) =>
      isIn ? prev.filter((x) => x !== pid) : [...prev, pid],
    );

    try {
      if (isIn) {
        await deleteContact(profileId, pid);
      } else {
        await insertContact(profileId, pid);
      }
      notifyProfileContactsChanged();
    } catch (e) {
      console.error("Failed to toggle contact", e);
      setContactProfileIds((prev) =>
        isIn ? [...prev, pid] : prev.filter((x) => x !== pid),
      );
      notifyProfileContactsChanged();
    }
  };

  const markProfileViewed = async (pid: string) => {
    if (!profileId) return;
    if (pid === profileId) return;
    if (viewedProfileIds.includes(pid)) return;

    setViewedProfileIds((prev) => [...prev, pid]);
    try {
      await insertProfileView(profileId, pid);
    } catch (e) {
      console.error("Failed to mark profile viewed", e);
      setViewedProfileIds((prev) => prev.filter((x) => x !== pid));
    }
  };

  return {
    contactProfileIds,
    setContactProfileIds,
    viewedProfileIds,
    blockedProfileIds,
    setBlockedProfileIds,
    toggleContact,
    markProfileViewed,
  };
}
