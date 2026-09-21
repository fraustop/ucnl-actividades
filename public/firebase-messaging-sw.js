importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyC-KKA0iTnadutGf5OqMnvkMc_vgntnY_8",
  authDomain: "ucnl-actividades.firebaseapp.com",
  projectId: "ucnl-actividades",
  storageBucket: "ucnl-actividades.firebasestorage.app",
  messagingSenderId: "709317883582",
  appId: "1:709317883582:web:f2838d2ba39467d2ac50ef"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Mensaje en segundo plano recibido: ', payload);
  const notificationTitle = payload.notification?.title || payload.data?.title || 'UCNL-Actividades en linea';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || 'Tienes una nueva notificación de tus materias.',
    icon: payload.notification?.icon || '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    vibrate: [200, 100, 200],
    requireInteraction: false,
    tag: payload.data?.tag || 'ucnl_daily_reminder',
    renotify: false,
    data: payload.data || { url: '/?action=confirm_notification' },
    actions: [
      {
        action: 'confirm_notification',
        title: '✅ Confirmar'
      }
    ]
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/?action=confirm_notification';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
