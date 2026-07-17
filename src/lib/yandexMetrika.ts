export const YANDEX_METRIKA_ID =
  process.env.NEXT_PUBLIC_YANDEX_METRIKA_ID ?? "110816502";

declare global {
  interface Window {
    __zeipMetrikaLoaded?: boolean;
    ym?: YandexMetrikaFn;
  }
}

type YandexMetrikaInitOptions = {
  ssr?: boolean;
  webvisor?: boolean;
  clickmap?: boolean;
  ecommerce?: string;
  referrer?: string;
  url?: string;
  accurateTrackBounce?: boolean;
  trackLinks?: boolean;
};

type YandexMetrikaFn = {
  (id: number, method: "init", options: YandexMetrikaInitOptions): void;
  (id: number, method: string, ...args: unknown[]): void;
  a?: unknown[];
  l?: number;
};

const TAG_BASE_URL = "https://mc.yandex.ru/metrika/tag.js";

function getTagUrl(counterId: number): string {
  return `${TAG_BASE_URL}?id=${counterId}`;
}

function getMetrikaId(): number | null {
  const parsed = Number.parseInt(YANDEX_METRIKA_ID, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function loadMetrikaScript(counterId: number): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const tagUrl = getTagUrl(counterId);
  for (let i = 0; i < document.scripts.length; i += 1) {
    if (document.scripts[i]?.src === tagUrl) {
      return;
    }
  }

  const script = document.createElement("script");
  script.async = true;
  script.src = tagUrl;
  document.head.appendChild(script);
}

/** Загружает и инициализирует Яндекс.Метрику. Идемпотентна. */
export function initYandexMetrika(): void {
  if (typeof window === "undefined") return;
  if (window.__zeipMetrikaLoaded) return;

  const counterId = getMetrikaId();
  if (!counterId) return;

  window.__zeipMetrikaLoaded = true;

  const ymFn = function (...args: unknown[]) {
    (ymFn.a = ymFn.a || []).push(args);
  } as YandexMetrikaFn;
  ymFn.l = Date.now();
  window.ym = ymFn;

  loadMetrikaScript(counterId);

  window.ym(counterId, "init", {
    ssr: true,
    webvisor: true,
    clickmap: true,
    ecommerce: "dataLayer",
    referrer: document.referrer,
    url: location.href,
    accurateTrackBounce: true,
    trackLinks: true,
  });
}
