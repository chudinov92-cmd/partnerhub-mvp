import { supabase } from "@/lib/supabaseClient";

const DISMISS_KEY = "zeip_push_dismissed_at";
const DISMISS_MS = 7 * 24 * 60 * 60 * 1000;

export type PushBrowserState = "unsupported" | "denied" | "default" | "subscribed";

function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isPushSupported(): boolean {
  if (typeof window === "undefined") return false;
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function isPushPromptDismissed(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const t = Number(raw);
    if (!Number.isFinite(t)) return false;
    return Date.now() - t < DISMISS_MS;
  } catch {
    return false;
  }
}

export function dismissPushPrompt(): void {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

/** Сброс «Не сейчас», чтобы снова показать баннер включения push. */
export function clearPushDismissFlag(): void {
  try {
    localStorage.removeItem(DISMISS_KEY);
  } catch {
    /* ignore */
  }
}

async function authHeader(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const t = session?.access_token;
  return t ? `Bearer ${t}` : null;
}

/** Состояние разрешения + факт регистрации endpoint в БД. */
export async function getPushBrowserState(): Promise<PushBrowserState> {
  if (!isPushSupported()) return "unsupported";
  const perm = Notification.permission;
  if (perm === "denied") return "denied";
  if (perm === "default") return "default";

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return "default";

  const hdr = await authHeader();
  if (!hdr) return "default";

  const endpoint = encodeURIComponent(subscription.endpoint);
  const res = await fetch(`/api/push/subscribe?endpoint=${endpoint}`, {
    headers: { Authorization: hdr },
    credentials: "same-origin",
  });
  if (!res.ok) return "default";
  const json = (await res.json()) as { registered?: boolean };
  return json.registered ? "subscribed" : "default";
}

export async function enablePush(): Promise<{ ok: boolean; error?: string }> {
  if (!isPushSupported()) return { ok: false, error: "Браузер не поддерживает push" };

  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidPublic) {
    return { ok: false, error: "Сервер не настроил VAPID (NEXT_PUBLIC_VAPID_PUBLIC_KEY)" };
  }

  const perm = await Notification.requestPermission();
  if (perm !== "granted") {
    return { ok: false, error: "Разрешение на уведомления не получено" };
  }

  const hdr = await authHeader();
  if (!hdr) {
    return { ok: false, error: "Нужно войти в аккаунт" };
  }

  const registration = await navigator.serviceWorker.ready;
  const existingSub = await registration.pushManager.getSubscription();
  await existingSub?.unsubscribe?.().catch(() => {});

  let subscription: PushSubscription;
  try {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublic),
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Ошибка подписки";
    return { ok: false, error: msg };
  }

  const body = subscription.toJSON() as {
    endpoint: string;
    keys?: { p256dh?: string; auth?: string };
  };

  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: {
      Authorization: hdr,
      "Content-Type": "application/json",
    },
    credentials: "same-origin",
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    return {
      ok: false,
      error: errText || `Ошибка сервера ${res.status}`,
    };
  }

  return { ok: true };
}

export async function disablePush(): Promise<{ ok: boolean; error?: string }> {
  if (!isPushSupported()) return { ok: false, error: "Неподдерживаемо" };
  const hdr = await authHeader();
  if (!hdr) return { ok: false, error: "Нужно войти в аккаунт" };

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return { ok: true };

  const endpoint = encodeURIComponent(subscription.endpoint);
  const del = await fetch(`/api/push/subscribe?endpoint=${endpoint}`, {
    method: "DELETE",
    headers: { Authorization: hdr },
    credentials: "same-origin",
  });

  await subscription.unsubscribe().catch(() => {});

  if (!del.ok) {
    const errText = await del.text();
    return { ok: false, error: errText || `Ошибка ${del.status}` };
  }
  return { ok: true };
}
