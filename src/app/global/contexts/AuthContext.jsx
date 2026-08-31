import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  apiGet,
  apiPost,
  clearTokens,
  getAccessToken,
  getRefreshToken,
  parseResponse,
  storeTokens,
} from '../api';
import { get, set } from 'idb-keyval';

const AuthContext = createContext(null);

const USER_CACHE_KEY = 'HARVESTWISE_USER_CACHE_V1';

/**
 * Map backend role_name to frontend route prefix.
 * Backend uses title-case: "Farmer", "Admin", "SuperAdmin", "DFTC"
 */
export function roleHome(roleName) {
  if (!roleName) return '/farmer';
  const r = roleName.toLowerCase();
  if (r === 'admin' || r === 'superadmin') return '/admin';
  if (r === 'dftc') return '/dftc';
  return '/farmer';
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // ------------------------------------------------------------------
  // Restore session on mount
  // - If online: fetch /auth/me, cache user in IndexedDB
  // - If offline but tokens exist: restore user from IndexedDB cache
  // - If no tokens: not logged in
  // ------------------------------------------------------------------
  useEffect(() => {
    const restore = async () => {
      const token = getAccessToken();
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const me = await apiGet('/api/v1/auth/me').then(parseResponse);
        setUser(me);
        // Cache user profile for offline restoration
        await set(USER_CACHE_KEY, me);
      } catch {
        // Network failure (not 401) — try to restore from IndexedDB cache
        try {
          const cachedUser = await get(USER_CACHE_KEY);
          if (cachedUser) {
            setUser(cachedUser);
            // Don't clear tokens — farmer is still "logged in", just offline
          } else {
            clearTokens();
            setUser(null);
          }
        } catch {
          clearTokens();
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    };

    restore();
  }, []);

  // ------------------------------------------------------------------
  // Listen for forced-logout event from the API client
  // ------------------------------------------------------------------
  useEffect(() => {
    const handle = () => {
      setUser(null);
    };
    window.addEventListener('hw:auth:expired', handle);
    return () => window.removeEventListener('hw:auth:expired', handle);
  }, []);

  // ------------------------------------------------------------------
  // Login: store tokens, then fetch /me to populate user object
  // ------------------------------------------------------------------
  const login = async (tokens) => {
    storeTokens(tokens);
    const me = await apiGet('/api/v1/auth/me').then(parseResponse);
    setUser(me);
    await set(USER_CACHE_KEY, me);
    return me;
  };

  // ------------------------------------------------------------------
  // Logout: tell backend, then clear local state regardless of outcome
  // ------------------------------------------------------------------
  const logout = async () => {
    const refreshToken = getRefreshToken();
    try {
      await apiPost('/api/v1/auth/logout', { refresh_token: refreshToken });
    } catch {
      // Best-effort — clear tokens locally even if the request fails
    } finally {
      clearTokens();
      setUser(null);
    }
  };

  // ------------------------------------------------------------------
  // Re-fetch /auth/me and update state + offline cache (after profile edits)
  // ------------------------------------------------------------------
  const refreshUser = async () => {
    const me = await apiGet('/api/v1/auth/me').then(parseResponse);
    setUser(me);
    await set(USER_CACHE_KEY, me);
    return me;
  };

  return (
    <AuthContext.Provider value={{ user, isLoggedIn: user !== null, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
