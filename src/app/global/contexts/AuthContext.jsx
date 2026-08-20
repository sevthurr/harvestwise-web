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

const AuthContext = createContext(null);

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
  // user shape: UserResponse from GET /auth/me
  // { id, username, email, phone, preferred_language, is_active, role: { id, role_name }, created_at }
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // true while restoring session on mount

  // ------------------------------------------------------------------
  // Restore session on mount — if we have stored tokens, fetch /me
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!getAccessToken()) {
      setLoading(false);
      return;
    }
    apiGet('/api/v1/auth/me')
      .then(parseResponse)
      .then(setUser)
      .catch(() => {
        // Tokens invalid / expired — clearTokens already happened via
        // apiFetch's 401 handler; just ensure clean state.
        clearTokens();
        setUser(null);
      })
      .finally(() => setLoading(false));
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

  return (
    <AuthContext.Provider value={{ user, isLoggedIn: user !== null, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
