/**
 * Per-user persistent "read" state for notifications that are derived
 * client-side (DFTC submissions, Admin audit logs). Farmer notifications
 * persist read state on the backend, so they do not use this helper.
 *
 * Read IDs are kept per user in localStorage so a read notification stays
 * read across logout / login on the same device/browser.
 */

const STORAGE_KEY_PREFIX = "hw:notif_read:";

/**
 * Load the set of read notification IDs for a user.
 * @param {string|number|null|undefined} userId
 * @returns {Set<string>}
 */
export function loadReadIds(userId) {
  if (userId === null || userId === undefined) return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + String(userId));
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    // corrupted / unavailable storage — fall back to empty set
    return new Set();
  }
}

/**
 * Persist the set of read notification IDs for a user.
 * @param {string|number|null|undefined} userId
 * @param {Set<string>} ids
 */
export function persistReadIds(userId, ids) {
  if (userId === null || userId === undefined) return;
  try {
    localStorage.setItem(
      STORAGE_KEY_PREFIX + String(userId),
      JSON.stringify([...ids])
    );
  } catch {
    // storage full / unavailable — non-fatal, degrade to in-memory behaviour
  }
}