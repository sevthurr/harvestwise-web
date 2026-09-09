/**
 * Farmer-specific formatters adhering strictly to the frozen specification formatting rules.
 */

export const SUPPORTED_PRICE_HORIZONS = [7, 14, 21, 28];

export function isValidHorizon(days) {
  const num = Number(days);
  return SUPPORTED_PRICE_HORIZONS.includes(num);
}

export function formatPrice(val) {
  if (val == null || isNaN(val) || !isFinite(val)) return null;
  const num = Number(val);
  if (num <= 0) return null; // spec: Price <= 0 treated as unavailable/invalid

  // Format whole number without decimal if exact, else up to 2 decimal places
  const hasDecimals = num % 1 !== 0;
  return num.toLocaleString('en-PH', {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  });
}

export function formatAbsoluteDifference(val1, val2) {
  if (val1 == null || val2 == null || isNaN(val1) || isNaN(val2)) return null;
  const num1 = Number(val1);
  const num2 = Number(val2);
  const diff = Math.abs(num1 - num2);
  return formatPrice(diff);
}

export function formatVolume(val) {
  if (val == null || isNaN(val) || !isFinite(val)) return null;
  const num = Number(val);
  if (num < 0) return null; // negative volume invalid
  const hasDecimals = num % 1 !== 0;
  return num.toLocaleString('en-PH', {
    minimumFractionDigits: hasDecimals ? 1 : 0,
    maximumFractionDigits: 2,
  });
}

export function formatNumber(val) {
  if (val == null || isNaN(val) || !isFinite(val)) return null;
  const num = Number(val);
  return num.toLocaleString('en-PH');
}

export function formatPercent(val) {
  if (val == null || isNaN(val) || !isFinite(val)) return null;
  const num = Math.abs(Number(val));
  return num.toLocaleString('en-PH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });
}
