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
    ? `${self.location.origin}/?chat=${encodeURIComponent(profileId)}`
    : self.location.origin;

  const options = {
    body,
    tag,
    renotify: true,
    icon: `${self.location.origin}/Icons/icon-192.png`,
    badge: `${self.location.origin}/Icons/badge-72.png`,
    data: { url, profileId },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const url = data.url || self.location.origin;
  const profileId = data.profileId || "";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && "focus" in client) {
          client.postMessage({
            type: "ZEIP_OPEN_CHAT",
            profileId,
            url,
          });
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    }),
  );
});
