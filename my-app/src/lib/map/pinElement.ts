/**
 * Map pin DOM helpers — HTML element creation, escape, visual keys, and tooltips.
 * Shared between PartnerMap and ProfileLocationPicker.
 */

export const PIN_FILL_COLOR = "#10B981";
export const PIN_BORDER_COLOR = "#FFFFFF";
export const PIN_HELLO_WRAP_CLASS = "partner-map-pin-wrap--hello";

export function escapeHtmlChar(char: string): string {
  if (char === "&") return "&amp;";
  if (char === "<") return "&lt;";
  if (char === ">") return "&gt;";
  if (char === '"') return "&quot;";
  return char;
}

export function escapeHtmlColor(hex: string, fallback: string): string {
  if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) return fallback;
  return hex;
}

export function escapeHtmlText(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function pinInitial(fullName: string | null | undefined): string {
  const c = fullName?.trim()?.[0];
  if (!c) return "?";
  return escapeHtmlChar(c.toLocaleUpperCase("ru-RU"));
}

export function markerVisualKey(row: {
  isOwn: boolean;
  isViewed: boolean;
  isFocused: boolean;
  subscriptionPlan: string;
  initial: string;
}): string {
  return `${row.isOwn}:${row.isFocused}:${row.isViewed}:${row.subscriptionPlan}:${row.initial}`;
}

/** Returns the CSS class list string that represents the visual identity of a marker. */
export function getMarkerVisual(
  key: ReturnType<typeof markerVisualKey>,
): string {
  return key;
}

export function createPinElement(
  letter: string,
  fillHex: string,
  borderColorHex: string,
  options?: { letterColorHex?: string; stemHex?: string },
): HTMLElement {
  const safeFill = escapeHtmlColor(fillHex, PIN_FILL_COLOR);
  const safeBorderColor = escapeHtmlColor(borderColorHex, PIN_BORDER_COLOR);
  const letterColorHex = options?.letterColorHex ?? "#FFFFFF";
  const safeLetterColor = escapeHtmlColor(letterColorHex, "#FFFFFF");
  const stemHex = options?.stemHex ?? fillHex;
  const safeStem = escapeHtmlColor(stemHex, safeFill);

  const root = document.createElement("div");
  root.className = "partner-map-marker-root";
  root.innerHTML = `<div class="partner-map-pin-wrap">
    <div class="partner-map-pin-head" style="background-color:${safeFill};border-color:${safeBorderColor}">
      <span class="partner-map-pin-letter" style="color:${safeLetterColor}">${letter}</span>
    </div>
    <div class="partner-map-pin-stem" style="background-color:${safeStem}"></div>
  </div>`;
  return root;
}

export function setMarkerTooltip(
  root: HTMLElement,
  fullName: string,
  roleTitle: string | null | undefined,
  online: boolean,
): void {
  let tooltip = root.querySelector<HTMLElement>(".partner-map-hover-tooltip");
  if (!tooltip) {
    tooltip = document.createElement("div");
    tooltip.className = "partner-map-hover-tooltip";
    root.appendChild(tooltip);
  }
  tooltip.innerHTML = `<div class="font-semibold">
    <span class="inline-flex items-center gap-2">
      <span>${escapeHtmlText(fullName)}</span>
      <span class="partner-map-online-dot ${online ? "is-online" : "is-offline"}" title="${online ? "Онлайн" : "Оффлайн"}"></span>
    </span>
  </div>${
    roleTitle
      ? `<div class="partner-map-tooltip-role">${escapeHtmlText(roleTitle)}</div>`
      : ""
  }`;
}

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function triggerOwnPinHello(
  wrap: HTMLElement,
  playedRef: { current: boolean },
): void {
  if (playedRef.current || prefersReducedMotion()) {
    playedRef.current = true;
    return;
  }

  playedRef.current = true;
  wrap.classList.add(PIN_HELLO_WRAP_CLASS);

  const head = wrap.querySelector<HTMLElement>(".partner-map-pin-head");
  if (!head) {
    wrap.classList.remove(PIN_HELLO_WRAP_CLASS);
    return;
  }

  const onAnimationEnd = (event: AnimationEvent) => {
    if (event.target !== head) return;
    wrap.classList.remove(PIN_HELLO_WRAP_CLASS);
    head.removeEventListener("animationend", onAnimationEnd);
  };

  head.addEventListener("animationend", onAnimationEnd);
}

export function scheduleOwnPinHello(
  map: unknown, // mmrgl.Map — avoids import dependency on mmr-gl
  wrap: HTMLElement,
  playedRef: { current: boolean },
): () => void {
  const mapObj = map as {
    once: (event: string, cb: () => void) => void;
    off: (event: string, cb: () => void) => void;
  };

  if (playedRef.current || prefersReducedMotion()) {
    playedRef.current = true;
    return () => {};
  }

  const onIdle = () => {
    mapObj.off("idle", onIdle);
    if (!wrap.isConnected || playedRef.current) return;
    triggerOwnPinHello(wrap, playedRef);
  };

  mapObj.once("idle", onIdle);
  return () => {
    mapObj.off("idle", onIdle);
  };
}