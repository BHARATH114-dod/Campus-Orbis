import axios from 'axios';

// ARCHITECTURE NOTE (Module 1):
// The existing Express backend (server.js) authenticates with an httpOnly
// session cookie set by POST /api/auth/login — there is no JWT or Firebase
// on the backend today. Rewriting that auth system was out of scope for a
// frontend migration (it would mean re-deriving every role-permission check
// already built and tested in server.js), so this app talks to the real,
// working backend as-is: `withCredentials: true` sends the session cookie
// on every request.
//
// This file is still "JWT-ready" in the sense the brief asked for: every
// call in the app goes through this one Axios instance, so if the backend
// grows a token-based auth mode later, only the two commented lines below
// change — no page or component needs to know how auth is implemented.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// --- JWT-ready hook point (inactive today) ---------------------------------
// api.interceptors.request.use((config) => {
//   const token = localStorage.getItem('campusync-token');
//   if (token) config.headers.Authorization = `Bearer ${token}`;
//   return config;
// });
// -----------------------------------------------------------------------------

// Normalize error handling: every failed call rejects with a plain object
// { status, message } so components never need to touch Axios's response shape.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.error || error.message || 'Something went wrong.';
    if (status === 401) {
      // Session expired or was never valid — let AuthContext react to this
      // via a custom event rather than importing it here (would create a
      // circular import between api.js and AuthContext.jsx).
      window.dispatchEvent(new CustomEvent('campusync:unauthorized'));
    }
    return Promise.reject({ status, message, data: error.response?.data });
  }
);

export default api;
