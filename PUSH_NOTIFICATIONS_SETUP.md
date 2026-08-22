# Push Notifications (Firebase Cloud Messaging) — Setup Guide

When a College Admin/HOD/Faculty posts an announcement, every student who
can already see it in-app (respecting the announcement's normal targeting —
college-wide, one department, or one section) also gets a real device push
notification. This works with the tab closed, in the background, or open.

## How it fits into the existing project

```
campus-orbis-backend/
  server.js                        ← firebase-admin init + sendPushToUsers() + 2 new routes (edited, not new)
  firebase-service-account.json    ← YOU add this (not included — see Step 2)
  .gitignore                       ← new, protects the file above

campus-orbis-react-frontend/
  src/
    firebase.js                     ← NEW — Firebase app init for the browser
    hooks/
      usePushNotifications.js       ← NEW — permission request + token registration + foreground messages
    services/
      pushTokenStore.js             ← NEW — tiny in-memory store so logout can find the current token
    App.jsx                         ← edited — mounts the push hook
    context/AuthContext.jsx         ← edited — unregisters the token on logout
    services/authService.js         ← edited — unregisterFcmToken()
  public/
    firebase-messaging-sw.js        ← NEW — handles notifications when the tab is closed/backgrounded
  .env.example                      ← edited — new VITE_FIREBASE_* keys
```

Nothing about this is required to run the app — if you skip this setup
entirely, Campus Orbis works exactly as before, just without push notifications
(the backend logs "Firebase Cloud Messaging: disabled" once and moves on).

## Step 1 — Create a Firebase project

1. Go to [console.firebase.google.com](https://console.firebase.google.com) → **Add project** → name it (e.g. "Campus Orbis") → finish the wizard (Google Analytics is optional, skip it if you don't want it).

## Step 2 — Backend credentials (service account)

1. In the Firebase Console: **Project settings** (gear icon) → **Service accounts** tab.
2. Click **Generate new private key** → confirm. This downloads a `.json` file.
3. Rename it to `firebase-service-account.json` and place it directly inside
   `campus-orbis-backend/` (same folder as `server.js`).
4. That's it — `server.js` looks for this exact file automatically on
   startup. `.gitignore` already excludes it, so it won't get committed.

**Never commit this file or share it** — it grants full admin access to your Firebase project.

## Step 3 — Frontend config (web app + push certificate)

1. Firebase Console → **Project settings** → **General** tab → scroll to
   "Your apps" → click the **</>** (web) icon to register a new web app
   (nickname doesn't matter, e.g. "Campus Orbis Web") → **Register app**.
2. It'll show you a `firebaseConfig` object with 6 values (`apiKey`,
   `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`).
3. In `campus-orbis-react-frontend/`, copy `.env.example` to `.env` and fill in
   those 6 values as `VITE_FIREBASE_*`.
4. Still in Firebase Console: **Project settings** → **Cloud Messaging**
   tab → scroll to **Web configuration** → **Web Push certificates** →
   click **Generate key pair** (if one doesn't already exist). Copy that
   key into `.env` as `VITE_FIREBASE_VAPID_KEY`.
5. **One extra manual step, and it's the one people usually miss:** open
   `campus-orbis-react-frontend/public/firebase-messaging-sw.js` and paste the
   same 6 config values into the `firebase.initializeApp({...})` call near
   the top of that file. Service workers run outside Vite's build process,
   so they can't read your `.env` file — this file needs its own copy of
   the same (non-secret) values.

## Step 4 — Install and run

```bash
cd campus-orbis-backend
npm install        # pulls in firebase-admin
npm start

cd campus-orbis-react-frontend
npm install         # pulls in firebase
npm run dev
```

## Step 5 — Try it

1. Log in as a student (in a browser tab) — you'll get a native "Allow
   notifications?" browser prompt shortly after. Click **Allow**.
2. In another browser (or an incognito window), log in as that student's
   College Admin/HOD/faculty and post a new announcement targeted so that
   student can see it.
3. The student should get a real OS-level notification within a couple of
   seconds — even if their Campus Orbis tab isn't focused, or the browser is
   just running in the background.

## Design notes (read if something looks intentional-but-different than expected)

- **Push goes to students only**, even though the in-app notification (bell
  icon) still goes to the announcement's full normal audience (which can
  include staff, per the existing visibility rules). A push notification is
  more intrusive than an in-app badge, so it's scoped to what was actually
  asked for.
- **It still respects the announcement's existing targeting.** Posting a
  section-only announcement pushes only to that section's students, not
  the whole college — it reuses the exact same audience-resolution logic
  (`usersForTarget`) that already decides who sees the announcement at all.
- **A user can have multiple device tokens** (phone browser, laptop
  browser, etc.) — all of them get the push, and dead tokens (uninstalled,
  permission revoked, expired) are pruned automatically the next time a
  push is sent to them.
- **Logging out unregisters that device's token**, so a shared/borrowed
  computer doesn't keep getting notifications meant for whoever just
  signed out.
- This feature is entirely opt-in and fails safe: no service account file →
  backend just doesn't send pushes (everything else works normally); user
  denies the browser permission prompt → same thing, no errors, no
  blocked functionality anywhere else in the app.
