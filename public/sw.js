/* eslint-disable no-undef */
self.addEventListener("push", (event) => {
  let payload = {};
  try {
    if (event.data) {
      payload = event.data.json();
    }
  } catch {
    payload = {};
  }

  const title =
    typeof payload.title === "string" && payload.title.trim()
      ? payload.title.trim()
      : "Zeip";
  const body =
    typeof payload.body === "string" && payload.body.trim()
      ? payload.body.trim()
      : "Новое сообщение";
  const profileId =
    typeof payload.profileId === "string" ? payload.profileId : "";
  const tag = profileId ? `chat-profile:${profileId}` : "zeip-message";

  const url = profileId
    ? `${self.location.origin}/map?chat=${encodeURIComponent(profileId)}`
    : `${self.location.origin}/map`;

  const options = {
    body,
    tag,
    renotify: true,
    // Держать баннер, пока пользователь не кликнет или не закроет (Chrome/macOS/Windows).
    requireInteraction: true,
    icon: `${self.location.origin}/Icons/icon-192.png`,
    badge: `${self.location.origin}/Icons/badge-72.png`,
    data: { url, profileId },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const url =
    typeof data.url === "string" && data.url.startsWith("http")
      ? data.url
      : `${self.location.origin}/map`;
  const profileId = data.profileId || "";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (!client.url.startsWith(self.location.origin)) continue;
        if ("navigate" in client) {
          return client.navigate(url).then((c) => c?.focus());
        }
        client.postMessage({
          type: "ZEIP_OPEN_CHAT",
          profileId,
          url,
        });
        return client.focus();
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    }),
  );
});
