import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  apiGet,
  apiPost,
  clearTokens,
  completeLegacyTokenMigration,
  getRefreshToken,
  parseResponse,
  storeTokens,
} from '../api';
import { get, set, del } from 'idb-keyval';
import { clearQueryPersistedCache, queryClient } from '../lib/queryClient';
import { loadFarmerOfflineData } from '../hooks/useFarmerPrefetch';

const AuthContext = createContext(null);

const USER_CACHE_KEY = 'HARVESTWISE_USER_CACHE_V1';
const PENDING_LOGOUT_KEY = 'hw_logout_pending';
const OFFLINE_GRACE_MS = 1000 * 60 * 60 * 24;

function browserIsOffline() {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

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
  const [offlineCacheStatus, setOfflineCacheStatus] = useState('idle');

  // Seed the offline bundle after a successful farmer session restore.
  // /auth/me nests the role as { role: { role_name } } — reading a top-level
  // `role_name` yields undefined, and roleHome() then defaults to '/farmer',
  // which seeded the farmer bundle for every role (403s on /farmer/*).
  //
  // The bundle carries the farmer's own crop plans, so the gate is an explicit
  // Farmer check. roleHome() maps any unknown or missing role name to
  // '/farmer', and the fallback path inside loadFarmerOfflineData requests
  // /crop-plans — so a session without a readable role must not seed it.
  const seedFarmerOffline = async (me) => {
    if ((me?.role?.role_name || '').toLowerCase() === 'farmer') {
      setOfflineCacheStatus('preparing');
      try {
        await loadFarmerOfflineData(queryClient);
        setOfflineCacheStatus('ready');
      } catch {
        setOfflineCacheStatus('error');
      }
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
      let pendingLogout = false;
      try { pendingLogout = localStorage.getItem(PENDING_LOGOUT_KEY) === 'true'; } catch {}
      if (pendingLogout) {
        if (!browserIsOffline()) {
          try {
            await apiPost('/api/v1/auth/logout', {});
            localStorage.removeItem(PENDING_LOGOUT_KEY);
          } catch (error) {
            if (error?.status) {
              try { localStorage.removeItem(PENDING_LOGOUT_KEY); } catch {}
            }
          }
        }
        clearTokens();
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        await completeLegacyTokenMigration();
        const me = await apiGet('/api/v1/auth/me').then(parseResponse);
        setUser(me);
        // Cache user profile for offline restoration
        await set(USER_CACHE_KEY, { user: me, cachedAt: Date.now(), expiresAt: Date.now() + OFFLINE_GRACE_MS });
        await seedFarmerOffline(me);
      } catch (error) {
        if (error?.status) {
          clearTokens();
          setUser(null);
          setLoading(false);
          return;
        }
        try {
          const cached = await get(USER_CACHE_KEY);
          const cachedUser = cached?.user ?? cached;
          const expiresAt = cached?.expiresAt ?? 0;
          if (cachedUser && expiresAt > Date.now()) {
            setUser(cachedUser);
            setOfflineCacheStatus('ready');
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
    const purge = ({ refetchActive = true } = {}) => {
      setUser(null);
      setOfflineCacheStatus('idle');
      clearQueryPersistedCache({ refetchActive });
      try { del(USER_CACHE_KEY); } catch {}
    };
    const handleExpiry = () => purge();
    const handleSessionChange = () => purge({ refetchActive: false });
    const flushPendingLogout = async () => {
      let pending = false;
      try { pending = localStorage.getItem(PENDING_LOGOUT_KEY) === 'true'; } catch {}
      if (!pending) return;
      try {
        await apiPost('/api/v1/auth/logout', {});
        localStorage.removeItem(PENDING_LOGOUT_KEY);
      } catch (error) {
        if (error?.status) {
          try { localStorage.removeItem(PENDING_LOGOUT_KEY); } catch {}
        }
      }
    };
    // A token key changing value in another tab means the session identity
    // changed underneath us.
    const handleStorage = (e) => {
      if (e.key === 'hw_access_token' || e.key === 'hw_refresh_token' || e.key === 'hw_session_generation') {
        purge({ refetchActive: false });
      }
    };
    window.addEventListener('hw:auth:expired', handleExpiry);
    window.addEventListener('hw:session:changed', handleSessionChange);
    window.addEventListener('online', flushPendingLogout);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('hw:auth:expired', handleExpiry);
      window.removeEventListener('hw:session:changed', handleSessionChange);
      window.removeEventListener('online', flushPendingLogout);
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
    await set(USER_CACHE_KEY, { user: me, cachedAt: Date.now(), expiresAt: Date.now() + OFFLINE_GRACE_MS });
    await seedFarmerOffline(me);
    return me;
  };

  // ------------------------------------------------------------------
  // Logout: tell backend, then clear local state regardless of outcome
  // ------------------------------------------------------------------
  const logout = async () => {
    const refreshToken = getRefreshToken();
    const offline = browserIsOffline();
    try {
      if (offline) {
        localStorage.setItem(PENDING_LOGOUT_KEY, 'true');
      } else {
        await apiPost('/api/v1/auth/logout', { refresh_token: refreshToken });
        localStorage.removeItem(PENDING_LOGOUT_KEY);
      }
    } catch (error) {
      // Keep a marker so the HttpOnly cookie session is revoked once the
      // browser reconnects. A local logout must never depend on the network.
      if (!error?.status) {
        try { localStorage.setItem(PENDING_LOGOUT_KEY, 'true'); } catch {}
      }
    } finally {
      clearTokens();
      setUser(null);
      setOfflineCacheStatus('idle');
      await clearQueryPersistedCache({ refetchActive: false });
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
    await set(USER_CACHE_KEY, { user: next, cachedAt: Date.now(), expiresAt: Date.now() + OFFLINE_GRACE_MS });
    return next;
  };

  return (
    <AuthContext.Provider value={{ user, isLoggedIn: user !== null, loading, offlineCacheStatus, login, logout, refreshUser, patchUser }}>
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
