import React, { createContext, useContext, useState } from 'react';
const AuthContext = createContext(null);
const STORAGE_KEY = 'hw_auth_user';

const DEFAULT_FARMER_USER = {
  name: "Juan Dela Cruz",
  email: "juan.delacruz@harvestwise.app",
  role: "farmer"
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const s = localStorage.getItem(STORAGE_KEY);
      if (s) return JSON.parse(s);
      // Start with NO user - user must log in
      return null;
    } catch {
      return null;
    }
  });

  const login = (u) => {
    setUser(u);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(u)); } catch {}
  };

  const logout = () => {
    setUser(null);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  };

  return (
    <AuthContext.Provider value={{ user, isLoggedIn: user !== null, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function resolveRole(email) {
  const e = email.toLowerCase();
  if (e.includes('admin')) return 'admin';
  if (e.includes('dftc')) return 'dftc';
  return 'farmer';
}

export function roleHome(role) {
  if (role === 'admin') return '/admin';
  if (role === 'dftc') return '/dftc';
  return '/farmer';
}
