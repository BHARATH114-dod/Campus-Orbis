import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { login as loginRequest, logout as logoutRequest, fetchCurrentUser, unregisterFcmToken } from '../services/authService';
import { getCurrentPushToken } from '../services/pushTokenStore';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // true while we check for an existing session

  // On first load, ask the backend if the session cookie (if any) is still valid.
  useEffect(() => {
    fetchCurrentUser()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  // Centralized 401 handling — see services/api.js's response interceptor.
  useEffect(() => {
    const onUnauthorized = () => setUser(null);
    window.addEventListener('campusync:unauthorized', onUnauthorized);
    return () => window.removeEventListener('campusync:unauthorized', onUnauthorized);
  }, []);

  const login = useCallback(async (credentials) => {
    const loggedInUser = await loginRequest(credentials);
    setUser(loggedInUser);
    return loggedInUser;
  }, []);

  const logout = useCallback(async () => {
    // Best-effort — a failure here shouldn't block the user from logging
    // out, so it's fire-and-forget with its own catch, not awaited.
    const token = getCurrentPushToken();
    if (token) unregisterFcmToken(token).catch(() => {});
    try {
      await logoutRequest();
    } finally {
      setUser(null);
    }
  }, []);

  const value = {
    user,
    role: user?.role || null,
    isAuthenticated: !!user,
    loading,
    login,
    logout,
    setUser, // exposed so ProfilePage can update the cached user after an edit
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
