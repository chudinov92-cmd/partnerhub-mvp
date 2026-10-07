"use client";

import { useEffect, useState } from "react";

const LG_QUERY = "(min-width: 1024px)";

export function useIsLgUp(): boolean | null {
  const [isLgUp, setIsLgUp] = useState<boolean | null>(() => {
    if (typeof window === "undefined") return null;
    return window.matchMedia(LG_QUERY).matches;
  });

  useEffect(() => {
    const mq = window.matchMedia(LG_QUERY);
    const update = () => setIsLgUp(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return isLgUp;
}
