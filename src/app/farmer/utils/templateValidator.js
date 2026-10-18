/**
 * Validates template interpolation params against frozen rules.
 * Never allow {token}, undefined, null, NaN, Infinity, or fake ₱0 to leak to the UI.
 */

export function validateTemplateParams(templateStr, params = {}) {
  if (!templateStr || typeof templateStr !== 'string') return false;

  const matches = templateStr.match(/\{(\w+)\}/g);
  if (!matches) return true; // No tokens to fill

  for (const match of matches) {
    const key = match.slice(1, -1);
    const val = params[key];

    if (val === undefined || val === null || val === '') {
      return false;
    }
    if (typeof val === 'number' && (isNaN(val) || !isFinite(val))) {
      return false;
    }
    const strVal = String(val).trim();
    if (strVal === 'NaN' || strVal === 'undefined' || strVal === 'null' || strVal === 'Infinity') {
      return false;
    }
    if (strVal.includes('{') || strVal.includes('}')) {
      return false; // raw nested token
    }
  }

  return true;
}

export function areAllDefined(...vals) {
  return vals.every(v => v !== undefined && v !== null && !Number.isNaN(v) && v !== '');
}
