import { en } from './locales/en';
import { ceb } from './locales/ceb';
import { tl } from './locales/tl';

export const LOCALES = {
  english: en,
  cebuano: ceb,
  tagalog: tl,
  en: en,
  ceb: ceb,
  tl: tl,
};

export function normalizeLangCode(lang) {
  if (!lang) return 'ceb';
  const str = String(lang).toLowerCase();
  if (str === 'english' || str === 'en') return 'en';
  if (str === 'cebuano' || str === 'ceb' || str === 'bisaya') return 'ceb';
  if (str === 'tagalog' || str === 'tl' || str === 'filipino') return 'tl';
  return 'ceb';
}

export function getDictionary(lang) {
  const code = normalizeLangCode(lang);
  return LOCALES[code] || ceb;
}

export function t(key, params = {}, lang = 'ceb') {
  if (!key) return '';
  const dict = getDictionary(lang);
  const fallbackDict = LOCALES.en;

  const keys = key.split('.');
  let val = dict;
  for (const k of keys) {
    if (val && typeof val === 'object' && k in val) {
      val = val[k];
    } else {
      val = null;
      break;
    }
  }

  if (!val && fallbackDict) {
    let fVal = fallbackDict;
    for (const k of keys) {
      if (fVal && typeof fVal === 'object' && k in fVal) {
        fVal = fVal[k];
      } else {
        fVal = null;
        break;
      }
    }
    val = fVal;
  }

  if (typeof val !== 'string') {
    return key;
  }

  if (params && typeof params === 'object') {
    return val.replace(/\{(\w+)\}/g, (_, p) => (p in params ? String(params[p]) : `{${p}}`));
  }

  return val;
}

export function formatCurrency(amount, lang = 'ceb') {
  if (amount == null || isNaN(amount)) return '₱0.00';
  const num = Number(amount);
  const formatted = num.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `₱${formatted}`;
}

export function formatNumber(val, options = {}, lang = 'ceb') {
  if (val == null || isNaN(val)) return '0';
  const num = Number(val);
  return num.toLocaleString('en-PH', options);
}

export function formatDate(dateVal, options = {}, lang = 'ceb') {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return String(dateVal);

  const defaultOpts = { month: 'short', day: 'numeric', year: 'numeric', ...options };
  const localeCode = lang === 'ceb' ? 'ceb-PH' : lang === 'tl' ? 'tl-PH' : 'en-PH';
  try {
    return d.toLocaleDateString(localeCode, defaultOpts);
  } catch {
    return d.toLocaleDateString('en-PH', defaultOpts);
  }
}
