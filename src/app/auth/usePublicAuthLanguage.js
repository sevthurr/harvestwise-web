import { useState, useEffect, useCallback } from 'react';
import { t as translate, normalizeLangCode } from '../global/i18n';

export const PUBLIC_AUTH_LANG_STORAGE_KEY = 'hw_public_auth_language';

export const AUTH_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'ceb', label: 'Bisaya' },
  { code: 'tl', label: 'Filipino' },
];

export function getStoredPublicAuthLanguage() {
  try {
    const raw = localStorage.getItem(PUBLIC_AUTH_LANG_STORAGE_KEY);
    if (raw) {
      const normalized = normalizeLangCode(raw);
      if (['en', 'ceb', 'tl'].includes(normalized)) {
        return normalized;
      }
    }
  } catch {
    // Ignore storage errors
  }
  // DEFAULT AUTH LANGUAGE: English
  return 'en';
}

export function usePublicAuthLanguage() {
  const [authLang, setAuthLangState] = useState(() => getStoredPublicAuthLanguage());

  useEffect(() => {
    document.documentElement.lang = authLang;
  }, [authLang]);

  // Synchronize if another component or tab changes the public auth language
  useEffect(() => {
    const handleSync = (e) => {
      const next = e.detail || getStoredPublicAuthLanguage();
      if (['en', 'ceb', 'tl'].includes(next)) {
        setAuthLangState(next);
      }
    };
    window.addEventListener('hw:public_auth_lang_changed', handleSync);
    return () => window.removeEventListener('hw:public_auth_lang_changed', handleSync);
  }, []);

  const setAuthLanguage = useCallback((lang) => {
    const code = normalizeLangCode(lang);
    if (!['en', 'ceb', 'tl'].includes(code)) return;
    setAuthLangState(code);
    try {
      localStorage.setItem(PUBLIC_AUTH_LANG_STORAGE_KEY, code);
    } catch {
      // Ignore storage errors
    }
    window.dispatchEvent(new CustomEvent('hw:public_auth_lang_changed', { detail: code }));
  }, []);

  const t = useCallback((key, params, fallback) => {
    const res = translate(key, params, authLang);
    if (res === key && fallback) return fallback;
    return res;
  }, [authLang]);

  const currentOption = AUTH_LANGUAGES.find((opt) => opt.code === authLang) || AUTH_LANGUAGES[0];

  return {
    authLang,
    setAuthLanguage,
    currentOption,
    languages: AUTH_LANGUAGES,
    t,
  };
}
