// UPDATED (Push notifications / FCM): this file MUST live at
// public/firebase-messaging-sw.js so Vite serves it unprocessed at
// https://your-site/firebase-messaging-sw.js — that exact path is what
// firebase.messaging().getToken() registers by default. It handles
// notifications that arrive while your app tab is closed or in the
// background; foreground notifications (tab open and focused) are instead
// handled by src/hooks/usePushNotifications.js via onMessage().
//
// Service workers run in their own worker context, completely separate
// from your Vite app — they can't use `import.meta.env` or ES module
// imports from your src/ code, which is why Firebase's own config object
// is pasted directly below instead of imported from src/firebase.js.
// These values are the same ones in your .env file / src/firebase.js —
// copy them here too. (They're safe to hardcode: Firebase's web config is
// designed to be public, see the comment in src/firebase.js.)

importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'PASTE_YOUR_FIREBASE_API_KEY_HERE',
  authDomain: 'PASTE_YOUR_FIREBASE_AUTH_DOMAIN_HERE',
  projectId: 'PASTE_YOUR_FIREBASE_PROJECT_ID_HERE',
  storageBucket: 'PASTE_YOUR_FIREBASE_STORAGE_BUCKET_HERE',
  messagingSenderId: 'PASTE_YOUR_FIREBASE_MESSAGING_SENDER_ID_HERE',
  appId: 'PASTE_YOUR_FIREBASE_APP_ID_HERE',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || 'Campus Orbis';
  self.registration.showNotification(title, {
    body: payload.notification?.body || '',
    icon: '/logo.png',
    badge: '/logo.png',
    data: payload.data || {},
  });
});

// Clicking the OS notification focuses an existing Campus Orbis tab if one is
// open, or opens a new one — rather than doing nothing, which is the
// default browser behavior otherwise.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ('focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow('/');
    })
  );
});
