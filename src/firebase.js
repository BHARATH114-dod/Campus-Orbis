import { initializeApp } from 'firebase/app';
import { isSupported, getMessaging } from 'firebase/messaging';

// UPDATED (Push notifications / FCM): these values come from your Firebase
// project's web app config — Firebase Console → Project settings → General
// → "Your apps" → the web app (</> icon) → SDK setup and configuration.
// They are NOT secret — Firebase's web config is meant to be shipped to the
// browser (it's restricted by Firebase's own security rules + domain
// allowlisting, not by being hidden). Safe to commit in this form, reading
// from env vars just makes it easy to use different Firebase projects for
// dev vs. production without editing code.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseApp = initializeApp(firebaseConfig);

/**
 * FCM isn't supported in every browser/context (e.g. Safari in some modes,
 * or if the page isn't served over HTTPS/localhost) — always check before
 * using it rather than assuming it's available.
 */
export async function getMessagingIfSupported() {
  try {
    if (await isSupported()) return getMessaging(firebaseApp);
  } catch {
    /* isSupported() itself can throw in some environments — treat as unsupported */
  }
  return null;
}
