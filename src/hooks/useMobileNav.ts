"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { MobileMainTab } from "@/components/MainMobileNav";

/** Query-param навигация: ?contacts=1, ?mapContacts=1, табы нижней панели. */
export function useMobileNav() {
  const router = useRouter();
  const [contactsOnlyMode, setContactsOnlyMode] = useState(false);
  const [mapContactsOnly, setMapContactsOnly] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileMainTab>("map");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const read = () => {
      const params = new URLSearchParams(window.location.search);
      setContactsOnlyMode(params.get("contacts") === "1");
      setMapContactsOnly(params.get("mapContacts") === "1");
    };

    read();

    const onLocationChange = () => read();

    const origPush = history.pushState;
    const origReplace = history.replaceState;

    history.pushState = function (
      this: History,
      ...args: Parameters<History["pushState"]>
    ) {
      const ret = origPush.apply(this, args as any);
      window.dispatchEvent(new Event("locationchange"));
      return ret;
    };
    history.replaceState = function (
      this: History,
      ...args: Parameters<History["replaceState"]>
    ) {
      const ret = origReplace.apply(this, args as any);
      window.dispatchEvent(new Event("locationchange"));
      return ret;
    };

    window.addEventListener("popstate", onLocationChange);
    window.addEventListener("locationchange", onLocationChange);

    return () => {
      history.pushState = origPush;
      history.replaceState = origReplace;
      window.removeEventListener("popstate", onLocationChange);
      window.removeEventListener("locationchange", onLocationChange);
    };
  }, []);

  useEffect(() => {
    if (contactsOnlyMode) setMobileTab("contacts");
  }, [contactsOnlyMode]);

  const resetContactsMode = () => {
    if (typeof window === "undefined") return;
    setContactsOnlyMode(false);
    const url = new URL(window.location.href);
    url.searchParams.delete("contacts");
    window.history.replaceState({}, "", url.toString());
    window.dispatchEvent(new Event("locationchange"));
  };

  const handleMobileTab = (t: MobileMainTab) => {
    setMobileTab(t);
    if (t === "contacts") {
      router.push("/?contacts=1");
      return;
    }
    if (contactsOnlyMode) resetContactsMode();
  };

  return {
    contactsOnlyMode,
    mapContactsOnly,
    mobileTab,
    setMobileTab,
    resetContactsMode,
    handleMobileTab,
  };
}
