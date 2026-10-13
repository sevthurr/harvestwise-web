/**
 * Per-user persistent "read" state for notifications.
 *
 * This started life as a helper for notifications derived purely client-side
 * (DFTC submissions, Admin audit logs); the backend did not persist read state
 * for those. It is now the local half of a union for *all three* notification
 * pages — see `useNotificationReadState`. The backend remains authoritative and
 * does persist `read_at`; this store only adds ids the user has acknowledged on
 * this device, so a mark-read still shows as read when the request could not
 * reach the server (offline PWA session, rural connectivity).
 *
 * Read IDs are kept per user in localStorage so a read notification stays
 * read across logout / login on the same device/browser. Being localStorage,
 * this does not follow the user to another device — a known limit, not a bug.
 *
 * The set only ever grows, which is safe because notifications are append-only:
 * read is one-way on the backend (no mark-as-unread route exists), so a stale
 * local entry can only ever agree with the server, never contradict it.
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