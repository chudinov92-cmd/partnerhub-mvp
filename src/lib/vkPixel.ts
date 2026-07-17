export const VK_PIXEL_ID = process.env.NEXT_PUBLIC_VK_PIXEL_ID ?? "3780633";

const SCRIPT_ID = "tmr-code";
const SCRIPT_URL = "https://top-fwz1.mail.ru/js/code.js";

declare global {
  interface Window {
    __zeipVkPixelLoaded?: boolean;
    _tmr?: TopMailRuEvent[];
  }
}

type TopMailRuEvent = {
  id: string;
  type: string;
  start: number;
};

function getPixelId(): string | null {
  const trimmed = VK_PIXEL_ID.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function loadPixelScript(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(SCRIPT_ID)) return;

  const script = document.createElement("script");
  script.type = "text/javascript";
  script.async = true;
  script.id = SCRIPT_ID;
  script.src = SCRIPT_URL;

  const firstScript = document.getElementsByTagName("script")[0];
  if (firstScript?.parentNode) {
    firstScript.parentNode.insertBefore(script, firstScript);
  } else {
    document.head.appendChild(script);
  }
}

/** Загружает и инициализирует пиксель VK рекламы (Top.Mail.Ru). Идемпотентна. */
export function initVkPixel(): void {
  if (typeof window === "undefined") return;
  if (window.__zeipVkPixelLoaded) return;

  const pixelId = getPixelId();
  if (!pixelId) return;

  window.__zeipVkPixelLoaded = true;

  const queue = window._tmr || (window._tmr = []);
  queue.push({ id: pixelId, type: "pageView", start: Date.now() });

  loadPixelScript();
}
