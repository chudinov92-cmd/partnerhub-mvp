import { useEffect } from "react";
import type { FeedFilters } from "@/types";
import { ONLINE_WINDOW_MS } from "./constants";

export function isOnline(lastSeenAt?: string | null) {
  if (!lastSeenAt) return false;
  const t = new Date(lastSeenAt).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t <= ONLINE_WINDOW_MS;
}

export function scrollComposerIntoView(el: HTMLElement | null) {
  if (!el) return;
  const run = () => el.scrollIntoView({ block: "nearest", behavior: "smooth" });
  requestAnimationFrame(run);
  window.setTimeout(run, 350);
}

export function persistFeedFilters(filters: FeedFilters) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    "feed_filters",
    JSON.stringify({ ...filters, recommendedContacts: false }),
  );
}

export function usePreventBodyScroll() {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";
    body.style.overscrollBehavior = "none";

    let rafId: number;
    const poll = () => {
      if (window.scrollY !== 0) window.scrollTo(0, 0);
      rafId = requestAnimationFrame(poll);
    };
    rafId = requestAnimationFrame(poll);

    return () => {
      cancelAnimationFrame(rafId);
      html.style.overflow = "";
      body.style.overflow = "";
      html.style.overscrollBehavior = "";
      body.style.overscrollBehavior = "";
    };
  }, []);
}
