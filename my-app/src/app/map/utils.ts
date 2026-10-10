import { useEffect } from "react";
import type { FeedFilters } from "@/types";
import { ONLINE_WINDOW_MS } from "./constants";

export { isOnline, scrollComposerIntoView } from "@my-startup/chat";

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

    let rafId: number | null = null;

    const stopPoll = () => {
      if (rafId != null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    };

    const poll = () => {
      if (window.scrollY !== 0) {
        window.scrollTo(0, 0);
        rafId = requestAnimationFrame(poll);
      } else {
        stopPoll();
      }
    };

    const startPollIfNeeded = () => {
      if (window.scrollY !== 0 && rafId == null) {
        rafId = requestAnimationFrame(poll);
      }
    };

    startPollIfNeeded();
    window.addEventListener("scroll", startPollIfNeeded, { passive: true });

    return () => {
      stopPoll();
      window.removeEventListener("scroll", startPollIfNeeded);
      html.style.overflow = "";
      body.style.overflow = "";
      html.style.overscrollBehavior = "";
      body.style.overscrollBehavior = "";
    };
  }, []);
}
