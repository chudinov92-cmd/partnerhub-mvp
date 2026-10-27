"use client";

export const ONLINE_WINDOW_MS = 2 * 60 * 1000;

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