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
  const notificationTitle = payload.notification?.title || 'UCNL Actividades';
  const notificationOptions = {
    body: payload.notification?.body || 'Tienes una nueva notificación de tus materias.',
    icon: payload.notification?.icon || '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: payload.data || { url: '/' }
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
