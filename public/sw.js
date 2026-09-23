self.addEventListener("push", (event) => {
  let data = { title: "Cluichí Home", body: "You have a reminder." };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    // non-JSON payload, keep default text
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      // No "badge" — Android's status-bar slot needs a plain white
      // silhouette on transparent background; our full-colour gradient
      // icon renders as a blank white square there. Omit it and let
      // Android fall back to its own default rather than a broken image.
      data: { url: data.url || "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
