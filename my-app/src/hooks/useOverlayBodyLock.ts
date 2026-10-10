"use client";

import { useEffect, useRef } from "react";

/** Блокирует scroll body, не затирая уже установленный lock (например usePreventBodyScroll на /map). */
export function useOverlayBodyLock(active: boolean) {
  const appliedRef = useRef(false);

  useEffect(() => {
    if (!active) return;

    const html = document.documentElement;
    const body = document.body;
    const wasAlreadyHidden =
      html.style.overflow === "hidden" || body.style.overflow === "hidden";

    if (!wasAlreadyHidden) {
      html.style.overflow = "hidden";
      body.style.overflow = "hidden";
      html.style.overscrollBehavior = "none";
      body.style.overscrollBehavior = "none";
      appliedRef.current = true;
    }

    return () => {
      if (appliedRef.current) {
        html.style.overflow = "";
        body.style.overflow = "";
        html.style.overscrollBehavior = "";
        body.style.overscrollBehavior = "";
        appliedRef.current = false;
      }
    };
  }, [active]);
}
