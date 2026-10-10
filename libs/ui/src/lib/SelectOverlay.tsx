"use client";

import { useIsLgUp } from "@my-startup/hooks";
import { DesktopSelectMenu } from "./DesktopSelectMenu";
import { MobileSelectSheet } from "./MobileSelectSheet";
import type { SelectOverlayCommonProps } from "./types";
import type { RefObject } from "react";

export function SelectOverlay({
  title,
  anchorRef,
  ...props
}: SelectOverlayCommonProps & {
  title: string;
  anchorRef: RefObject<HTMLElement | null>;
}) {
  const isLgUp = useIsLgUp();

  if (isLgUp === null) return null;

  if (isLgUp) {
    return <DesktopSelectMenu anchorRef={anchorRef} {...props} />;
  }

  return <MobileSelectSheet title={title} {...props} />;
}
