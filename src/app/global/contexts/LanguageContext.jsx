import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { t as translate, formatCurrency as fmtCurrency, formatDate as fmtDate, formatNumber as fmtNumber, normalizeLangCode } from '../i18n';

const LANGUAGE_STORAGE_KEY = 'hw_language_preference';
const SUPPORTED_LANGUAGES = ['ceb', 'en', 'tl'];

const LanguageContext = createContext(null);

function roleDefaultLanguage(role) {
  return role === 'farmer' ? 'ceb' : 'en';
}

export function LanguageProvider({ children }) {
  const { user } = useAuth();

  // In-session explicit selection (starts null, set when user clicks picker)
  const [sessionLanguage, setSessionLanguage] = useState(null);

  // Stored device language from localStorage (normalized)
  const [deviceLanguage] = useState(() => {
    try {
      const raw = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (raw) return normalizeLangCode(raw);
      return null;
    } catch {
      return null;
    }
  });

  const activeRole = useMemo(() => {
    const r = user?.role?.role_name ?? user?.role;
    return typeof r === 'string' ? r.toLowerCase() : null;
  }, [user?.role]);

  const accountLanguage = useMemo(() => {
    if (!user?.preferred_language) return null;
    return normalizeLangCode(user.preferred_language);
  }, [user?.preferred_language]);

  const effectiveLanguage = useMemo(() => {
    // 1. Explicit current-session picker choice takes highest priority
    if (sessionLanguage) return sessionLanguage;

    // 2. Authenticated user resolution
    if (user) {
      if (accountLanguage) return accountLanguage;
      if (activeRole === 'farmer') return 'ceb';
      return roleDefaultLanguage(activeRole);
    }

    // 3. Unauthenticated device storage preference
    if (deviceLanguage) return deviceLanguage;
    if (activeRole) return roleDefaultLanguage(activeRole);

    // Default for Farmer / General app is Cebuano
    return 'ceb';
  }, [sessionLanguage, user, accountLanguage, activeRole, deviceLanguage]);

  const langCode = useMemo(() => normalizeLangCode(effectiveLanguage), [effectiveLanguage]);

  useEffect(() => {
    document.documentElement.lang = langCode;
  }, [langCode]);

  // Synchronize localStorage whenever effective language changes
  useEffect(() => {
    if (effectiveLanguage) {
      try {
        localStorage.setItem(LANGUAGE_STORAGE_KEY, effectiveLanguage);
      } catch {
        // Ignore storage failures
      }
    }
  }, [effectiveLanguage]);

  // Reset in-session override on logout
  useEffect(() => {
    if (!user) {
      setSessionLanguage(null);
    }
  }, [user]);

  const setLanguage = useCallback((language) => {
    const code = normalizeLangCode(language);
    if (!['en', 'ceb', 'tl'].includes(code)) return;
    setSessionLanguage(code);
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, code);
    } catch {
      // Ignore storage failures and keep in-memory preference.
    }
  }, []);

  const clearLanguagePreference = useCallback(() => {
    setSessionLanguage(null);
    try {
      localStorage.removeItem(LANGUAGE_STORAGE_KEY);
    } catch {
      // Ignore storage failures.
    }
  }, []);

  const t = useCallback((key, params, fallback) => {
    const res = translate(key, params, langCode);
    if (res === key && fallback) return fallback;
    return res;
  }, [langCode]);

  const formatCurrency = useCallback((amount) => {
    return fmtCurrency(amount, langCode);
  }, [langCode]);

  const formatDate = useCallback((dateVal, options) => {
    return fmtDate(dateVal, options, langCode);
  }, [langCode]);

  const formatNumber = useCallback((val, options) => {
    return fmtNumber(val, options, langCode);
  }, [langCode]);

  return (
    <LanguageContext.Provider
      value={{
        activeRole,
        effectiveLanguage,
        selectedLanguage: effectiveLanguage,
        sessionLanguage,
        accountLanguage,
        setLanguage,
        clearLanguagePreference,
        supportedLanguages: SUPPORTED_LANGUAGES,
        t,
        formatCurrency,
        formatDate,
        formatNumber,
        langCode,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
