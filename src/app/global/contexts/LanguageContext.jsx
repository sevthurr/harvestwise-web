import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { t as translate, formatCurrency as fmtCurrency, formatDate as fmtDate, formatNumber as fmtNumber, normalizeLangCode } from '../i18n';

const LANGUAGE_STORAGE_KEY = 'hw_language_preference';
const SUPPORTED_LANGUAGES = ['english', 'cebuano', 'tagalog'];

const LanguageContext = createContext(null);

function roleDefaultLanguage(role) {
  return role === 'farmer' ? 'english' : 'english';
}

export function LanguageProvider({ children }) {
  const { user } = useAuth();
  const [selectedLanguage, setSelectedLanguage] = useState(() => {
    try {
      const raw = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (raw && SUPPORTED_LANGUAGES.includes(raw)) return raw;
      return null;
    } catch {
      return null;
    }
  });

  const activeRole = useMemo(() => {
    return user?.role ?? null;
  }, [user?.role]);

  const effectiveLanguage = useMemo(() => {
    if (selectedLanguage) return selectedLanguage;
    if (activeRole) return roleDefaultLanguage(activeRole);
    // Unauthenticated default is English
    return 'english';
  }, [activeRole, selectedLanguage]);

  const langCode = useMemo(() => normalizeLangCode(effectiveLanguage), [effectiveLanguage]);

  useEffect(() => {
    document.documentElement.lang = langCode;
  }, [langCode]);

  const setLanguage = useCallback((language) => {
    if (!SUPPORTED_LANGUAGES.includes(language)) return;
    setSelectedLanguage(language);
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    } catch {
      // Ignore storage failures and keep in-memory preference.
    }
  }, []);

  const clearLanguagePreference = useCallback(() => {
    setSelectedLanguage(null);
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
        selectedLanguage,
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
