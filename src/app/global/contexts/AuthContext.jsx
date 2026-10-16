import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  apiGet,
  apiPost,
  parseResponse,
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
  // - If online: fetch /auth/me (browser sends cookies automatically),
  //   cache user in IndexedDB
  // - If offline but cached user exists: restore user from IndexedDB cache
  // - If not authenticated: not logged in
  // ------------------------------------------------------------------
  useEffect(() => {
    const restore = async () => {
      try {
        const me = await apiGet('/api/v1/auth/me').then(parseResponse);
        setUser(me);
        // Cache user profile for offline restoration
        await set(USER_CACHE_KEY, me);
        seedFarmerOffline(me);
      } catch (err) {
        if (err?.status === 401) {
          setUser(null);
          try { await del(USER_CACHE_KEY); } catch {}
          await clearQueryPersistedCache();
          return;
        }

        // Network failure — try to restore from IndexedDB cache
        try {
          const cachedUser = await get(USER_CACHE_KEY);
          if (cachedUser) {
            setUser(cachedUser);
            // Farmer is still "logged in", just offline
          } else {
            setUser(null);
          }
        } catch {
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    };

    restore();
  }, []);

  // ------------------------------------------------------------------
  // Listen for forced-logout event from the API client (refresh failed).
  // Also listens on a BroadcastChannel so that logging out in one tab
  // logs out all other tabs — without it, tab A stays logged in while
  // tab B has already logged out, and both tabs read/write the same
  // shared caches. Shared handsets are the norm here.
  // ------------------------------------------------------------------
  useEffect(() => {
    const purge = () => {
      setUser(null);
      clearQueryPersistedCache();
      try { del(USER_CACHE_KEY); } catch {}
    };
    const handleExpiry = () => purge();

    let channel;
    try {
      channel = new BroadcastChannel('harvestwise-auth');
      channel.onmessage = (e) => {
        if (e.data === 'logout') purge();
      };
    } catch {
      // BroadcastChannel not supported — single-tab only
    }

    window.addEventListener('hw:auth:expired', handleExpiry);
    return () => {
      window.removeEventListener('hw:auth:expired', handleExpiry);
      if (channel) channel.close();
    };
  }, []);

  // ------------------------------------------------------------------
  // Login: clear prior cache, fetch /me (cookies already set by backend)
  // ------------------------------------------------------------------
  const login = async () => {
    await clearQueryPersistedCache();
    const me = await apiGet('/api/v1/auth/me').then(parseResponse);
    setUser(me);
    await set(USER_CACHE_KEY, me);
    seedFarmerOffline(me);
    return me;
  };

  // ------------------------------------------------------------------
  // Logout: tell backend (it clears cookies), clear local state, and
  // notify other tabs via BroadcastChannel
  // ------------------------------------------------------------------
  const logout = async () => {
    try {
      await apiPost('/api/v1/auth/logout', {});
    } catch {
      // Best-effort — clear local state even if the request fails
    } finally {
      setUser(null);
      await clearQueryPersistedCache();
      try { await del(USER_CACHE_KEY); } catch {}
      // Notify other tabs
      try {
        const bc = new BroadcastChannel('harvestwise-auth');
        bc.postMessage('logout');
        bc.close();
      } catch {
        // BroadcastChannel not supported
      }
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
