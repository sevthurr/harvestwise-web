import { useCallback, useEffect, useRef, useState } from "react";
import {
  loadReadIds,
  persistReadIds,
} from "../../../services/notificationReadState";

/**
 * Offline-tolerant read state for the notification feeds.
 *
 * The backend is authoritative — `read_at` / the computed `read` field decide
 * whether a notification is read. On top of that we keep a per-user local set
 * of ids the user has already acknowledged on this device, so a notification
 * still shows as read when the mark-read request could not reach the server
 * (rural connectivity, offline PWA session).
 *
 * The local set only ever *adds*: `isRead` is a union of server state and local
 * state. That is safe because notifications are append-only — once read, a
 * notification is never legitimately unread again — so a stale local entry can
 * never contradict the server, only agree with it.
 */

// Bounded so localStorage cannot grow without limit as the feed accumulates.
const MAX_TRACKED_IDS = 500;

export function useNotificationReadState(userId) {
  const [readIds, setReadIds] = useState(() => loadReadIds(userId));
  const readIdsRef = useRef(readIds);

  // Reload when the signed-in user changes so ids never leak across accounts.
  useEffect(() => {
    const next = loadReadIds(userId);
    readIdsRef.current = next;
    setReadIds(next);
  }, [userId]);

  useEffect(() => {
    readIdsRef.current = readIds;
  }, [readIds]);

  /**
   * Mark ids read locally, immediately. Safe to call before the server call
   * succeeds, and safe to call with a list for "mark all as read".
   */
  const markReadLocally = useCallback(
    (...ids) => {
      const fresh = ids.flat().filter((id) => id !== null && id !== undefined);
      if (fresh.length === 0) return;

      const next = new Set(readIdsRef.current);
      let changed = false;
      for (const id of fresh) {
        if (!next.has(id)) {
          next.add(id);
          changed = true;
        }
      }
      if (!changed) return;

      const trimmed =
        next.size > MAX_TRACKED_IDS
          ? new Set(Array.from(next).slice(-MAX_TRACKED_IDS))
          : next;
      readIdsRef.current = trimmed;
      persistReadIds(userId, trimmed);
      setReadIds(trimmed);
    },
    [userId],
  );

  /**
   * A notification counts as read if the server says so, or if this device
   * already acknowledged it. Accepts the raw API item.
   */
  const isRead = useCallback(
    (item) => {
      if (!item) return false;
      if (item.read_at || item.read === true) return true;
      return readIds.has(item.id);
    },
    [readIds],
  );

  return { readIds, isRead, markReadLocally };
}
