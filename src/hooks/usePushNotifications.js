import { useEffect, useRef } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { getMessagingIfSupported } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { setCurrentPushToken } from '../services/pushTokenStore';
import api from '../services/api';

/**
 * Sets up Firebase Cloud Messaging for the signed-in user:
 *  1. Registers the FCM service worker.
 *  2. Asks the browser for notification permission (does nothing if denied
 *     or already decided — this only prompts once per browser, by design
 *     of the browser's own permission API, not something this hook controls).
 *  3. Gets this device's FCM token and sends it to the backend
 *     (POST /api/account/fcm-token) so server.js can push to it later.
 *  4. Listens for messages that arrive while the tab is open/focused
 *     (background messages are handled separately, by
 *     public/firebase-messaging-sw.js) and surfaces them as a toast.
 *
 * Call this once, near the root of the app, only while authenticated —
 * see App.jsx.
 */
export function usePushNotifications() {
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const registeredRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || registeredRef.current) return;
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return; // unsupported browser

    let unsubscribeOnMessage;

    (async () => {
      const messaging = await getMessagingIfSupported();
      if (!messaging) return;

      try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;

        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
        const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });

        if (token) {
          await api.post('/account/fcm-token', { token });
          setCurrentPushToken(token);
          registeredRef.current = true;
        }

        unsubscribeOnMessage = onMessage(messaging, (payload) => {
          showToast(payload.notification?.title || 'New notification', 'info');
        });
      } catch (err) {
        // Not fatal — the rest of the app (including in-app notifications)
        // works fine without push. Common causes: user denied permission,
        // browser doesn't support FCM, or VAPID key isn't configured yet.
        console.error('Push notification setup failed:', err);
      }
    })();

    return () => unsubscribeOnMessage?.();
  }, [isAuthenticated, showToast]);
}
