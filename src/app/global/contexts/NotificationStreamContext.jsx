import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { openEventStream } from "../api";
import { useAuth } from "./AuthContext";

/**
 * One authenticated SSE connection to /notifications/stream for the whole app.
 *
 * The endpoint is rate limited to 60/minute and every open connection pins a
 * Redis pubsub subscriber and a worker for the life of the stream, so opening
 * one per layout *and* per notification page meant 2-3 concurrent streams per
 * session. A single shared connection with a subscriber registry removes that
 * entirely: callers register a handler and get fan-out.
 *
 * Public API is `useNotificationEvent(eventName, handler)`. It is null-safe —
 * with no provider mounted (unit tests, isolated renders) it subscribes to
 * nothing instead of throwing.
 */

const NotificationStreamContext = createContext(null);

const STREAM_PATH = "/notifications/stream";
const NOOP_UNSUBSCRIBE = () => {};
const NOOP_SUBSCRIBE = () => NOOP_UNSUBSCRIBE;

export const NotificationStreamProvider = ({ children }) => {
  const { user } = useAuth();
  const subscribersRef = useRef(new Map());

  // Fan out to a snapshot: a handler is allowed to unsubscribe itself.
  const emit = useCallback((eventName, data) => {
    const subscribers = subscribersRef.current.get(eventName);
    if (!subscribers || subscribers.size === 0) return;
    for (const handler of Array.from(subscribers)) {
      try {
        handler(data);
      } catch (err) {
        console.warn(`notification handler for ${eventName} failed`, err);
      }
    }
  }, []);

  const subscribe = useCallback((eventName, handler) => {
    if (!eventName || typeof handler !== "function") return NOOP_UNSUBSCRIBE;
    let subscribers = subscribersRef.current.get(eventName);
    if (!subscribers) {
      subscribers = new Set();
      subscribersRef.current.set(eventName, subscribers);
    }
    subscribers.add(handler);
    return () => {
      subscribers.delete(handler);
      if (subscribers.size === 0) subscribersRef.current.delete(eventName);
    };
  }, []);

  useEffect(() => {
    // Never open an unauthenticated stream: the endpoint rejects it anyway,
    // and the retry loop would keep burning the rate limit on /login.
    if (!user?.id) return undefined;

    const stream = openEventStream(STREAM_PATH, {
      "*": (data, eventName) => {
        emit(eventName, data);
        // The shared data channel carries its own discriminator in the
        // payload (`type`), and bulk broadcasts reuse this channel — a
        // notification created for many users arrives here rather than on the
        // per-user channel. Dispatching on the payload type as well means
        // subscribers see bulk events regardless of which channel carried
        // them, and never have to know which is which.
        const payloadType =
          data && typeof data.type === "string" && data.type !== eventName
            ? data.type
            : "";
        if (payloadType) emit(payloadType, data);
      },
    });

    return () => stream.close();
  }, [user?.id, emit]);

  const value = useMemo(() => ({ subscribe }), [subscribe]);

  return (
    <NotificationStreamContext.Provider value={value}>
      {children}
    </NotificationStreamContext.Provider>
  );
};

/**
 * Run `handler` whenever `eventName` arrives on the shared notification
 * stream.
 *
 * The handler is read through a ref, so an inline arrow function re-created on
 * every render still subscribes exactly once — no resubscribe churn, no stale
 * closure, no missed events.
 *
 * @param {string} eventName  e.g. 'NOTIFICATION_CREATED' | 'DATASET_INGESTED'
 * @param {(data: any) => void} handler
 */
export function useNotificationEvent(eventName, handler) {
  const context = useContext(NotificationStreamContext);
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const subscribe = context?.subscribe ?? NOOP_SUBSCRIBE;
    return subscribe(eventName, (data) => handlerRef.current?.(data));
  }, [eventName, context]);
}

export { NotificationStreamContext };
