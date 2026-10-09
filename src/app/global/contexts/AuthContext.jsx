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
import { get, set, del } from 'idb-keyval';
import { clearQueryPersistedCache, queryClient } from '../lib/queryClient';
import { loadFarmerOfflineData } from '../hooks/useFarmerPrefetch';

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

  // Seed the offline bundle after a successful farmer session restore.
  // /auth/me nests the role as { role: { role_name } } — reading a top-level
  // `role_name` yields undefined, and roleHome() then defaults to '/farmer',
  // which seeded the farmer bundle for every role (403s on /farmer/*).
  const seedFarmerOffline = (me) => {
    if (me && roleHome(me.role?.role_name) === '/farmer') {
      loadFarmerOfflineData(queryClient).catch(() => {});
    }
  };

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
        seedFarmerOffline(me);
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
  // Listen for forced-logout event from the API client.
  // api.js only dispatches this when the 401'd request actually carried a
  // token, so an anonymous 401 must never reach here. clearQueryPersistedCache
  // uses resetQueries() (not clear()) so mounted observers are not stranded.
  //
  // Also clears on the browser 'storage' event, which fires when ANOTHER tab
  // logs out or logs in as someone else. Without it, tab A stays logged in with
  // user A's tokens while tab B has already switched to user B, and both tabs
  // read and write the same shared caches. Shared handsets are the norm here,
  // and this is the path that leaks one farmer's data to the next.
  // ------------------------------------------------------------------
  useEffect(() => {
    const purge = () => {
      setUser(null);
      clearQueryPersistedCache();
      try { del(USER_CACHE_KEY); } catch {}
    };
    const handleExpiry = () => purge();
    // A token key changing value in another tab means the session identity
    // changed underneath us.
    const handleStorage = (e) => {
      if (e.key === 'hw_access_token' || e.key === 'hw_refresh_token') purge();
    };
    window.addEventListener('hw:auth:expired', handleExpiry);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('hw:auth:expired', handleExpiry);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  // ------------------------------------------------------------------
  // Login: clear prior cache, store tokens, then fetch /me
  // ------------------------------------------------------------------
  const login = async (tokens) => {
    await clearQueryPersistedCache();
    storeTokens(tokens);
    const me = await apiGet('/api/v1/auth/me').then(parseResponse);
    setUser(me);
    await set(USER_CACHE_KEY, me);
    seedFarmerOffline(me);
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
      await clearQueryPersistedCache();
      try { await del(USER_CACHE_KEY); } catch {}
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

  // ------------------------------------------------------------------
  // Apply an already-known field change, without a network round-trip.
  //
  // refreshUser() is the right call when the server may have derived a value,
  // but it is the wrong tool for a response the caller is already holding: it
  // re-reads state the client was just told, so it can only ever be as fresh as
  // the request survives. `profile_picture_path` is the case that matters — the
  // upload response carries the stored URL, and every avatar in the app reads it
  // from this object, so making the topnav wait on a second request meant a slow
  // or failed /auth/me left the freshly uploaded picture invisible everywhere
  // except the page that uploaded it. refreshUser() still runs afterwards to
  // reconcile with the server and IndexedDB; this only removes the round-trip
  // from the path that has to succeed.
  // ------------------------------------------------------------------
  const patchUser = async (partial) => {
    if (!user) return null;
    const next = { ...user, ...partial };
    setUser(next);
    await set(USER_CACHE_KEY, next);
    return next;
  };

  return (
    <AuthContext.Provider value={{ user, isLoggedIn: user !== null, loading, login, logout, refreshUser, patchUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

/**
 * Same as `useAuth` but returns null instead of throwing when there is no
 * provider. For components that can degrade gracefully outside an auth tree —
 * per-user local read state, for example, which simply starts empty rather
 * than taking the whole page down.
 */
export function useOptionalAuth() {
  return useContext(AuthContext);
}
