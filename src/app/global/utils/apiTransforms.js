/**
 * API Transformation Utilities
 * 
 * These utilities help transform backend API responses (snake_case)
 * to frontend format (camelCase) and handle date/price formatting.
 */

/**
 * Transform snake_case to camelCase recursively
 * 
 * @param {any} obj - Object, array, or primitive to transform
 * @returns {any} - Transformed value with camelCase keys
 * 
 * @example
 * toCamelCase({ commodity_id: 'kamatis', updated_at: '2026-06-24' })
 * // Returns: { commodityId: 'kamatis', updatedAt: '2026-06-24' }
 */
export function toCamelCase(obj) {
  if (Array.isArray(obj)) {
    return obj.map(toCamelCase);
  }
  
  if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
    return Object.entries(obj).reduce((acc, [key, value]) => {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      acc[camelKey] = toCamelCase(value);
      return acc;
    }, {});
  }
  
  return obj;
}

/**
 * Format ISO date to human-readable format (matches mock format)
 * 
 * @param {string} isoDate - ISO date string (e.g., "2026-06-24")
 * @returns {string|null} - Formatted date (e.g., "Jun 24, 2026")
 * 
 * @example
 * formatDate('2026-06-24') // Returns: "Jun 24, 2026"
 */
export function formatDate(isoDate) {
  if (!isoDate) return null;
  const date = new Date(isoDate);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

/**
 * Format price with peso sign
 * 
 * @param {number|string} price - Price value
 * @returns {string} - Formatted price with ₱ sign
 * 
 * @example
 * formatPrice(85.0) // Returns: "₱85"
 * formatPrice("125.50") // Returns: "₱125.50"
 */
export function formatPrice(price) {
  if (price === null || price === undefined) return '₱0';
  return `₱${Number(price).toLocaleString('en-PH')}`;
}

/**
 * Convert Decimal string to number
 * 
 * @param {string|number} value - Value to convert
 * @returns {number|null} - Parsed number
 * 
 * @example
 * toNumber("85.50") // Returns: 85.5
 */
export function toNumber(value) {
  if (value === null || value === undefined) return null;
  return parseFloat(value);
}

/**
 * Format ISO datetime to human-readable format
 * 
 * @param {string} isoDateTime - ISO datetime string
 * @returns {string|null} - Formatted datetime
 * 
 * @example
 * formatDateTime('2026-06-24T10:30:00Z') // Returns: "Jun 24, 2026 at 10:30 AM"
 */
export function formatDateTime(isoDateTime) {
  if (!isoDateTime) return null;
  const date = new Date(isoDateTime);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }) + ' at ' + date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'UTC',
  });
}

/**
 * Normalize trend/direction to title case
 * 
 * @param {string} trend - Trend value from API
 * @returns {string} - Normalized trend
 * 
 * @example
 * normalizeTrend('rising') // Returns: "Rising"
 * normalizeTrend('STABLE') // Returns: "Stable"
 */
export function normalizeTrend(trend) {
  if (!trend) return 'Stable';
  return trend.charAt(0).toUpperCase() + trend.slice(1).toLowerCase();
}
