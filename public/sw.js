// Service worker minimo: solo notificaciones. No cachea nada (los datos deben estar siempre al dia).

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

// El push llega sin contenido: mostramos un aviso generico y la app dice cual medicina toca.
self.addEventListener('push', (e) => {
  e.waitUntil(
    self.registration.showNotification('Isabella: hora de medicación', {
      body: 'Hay una medicación por dar. Abre la app para ver cuál.',
      icon: 'icon-192.png',
      badge: 'icon-192.png',
      tag: 'dosis',
      renotify: true,
      requireInteraction: true,
      vibrate: [300, 150, 300, 150, 300],
    })
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((ventanas) => {
      for (const v of ventanas) {
        if ('focus' in v) return v.focus();
      }
      return self.clients.openWindow('./');
    })
  );
});
