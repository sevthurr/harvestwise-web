import { apiGet, apiPost, parseResponse, getAccessToken, buildUrl } from "../../app/global/api";

/**
 * Fetch paginated current user notifications.
 * @param {number} page
 * @param {number} pageSize
 * @returns {Promise<import("../../app/global/api").FarmerNotificationListResponse>}
 */
export async function listNotifications(page = 1, pageSize = 30) {
  const res = await apiGet(`/me/notifications?page=${page}&page_size=${pageSize}`);
  return parseResponse(res);
}

/**
 * Fetch just the unread count (lightweight).
 * @returns {Promise<{unread_count: number}>}
 */
export async function getUnreadCount() {
  const res = await apiGet("/me/notifications/unread-count");
  return parseResponse(res);
}

/**
 * Mark a single notification as read.
 * @param {string} id
 */
export async function markRead(id) {
  const res = await apiPost(`/me/notifications/${id}/read`, {});
  return parseResponse(res);
}

/**
 * Mark all notifications as read for current user.
 * @returns {Promise<{updated: number}>}
 */
export async function markAllRead() {
  const res = await apiPost("/me/notifications/read-all", {});
  return parseResponse(res);
}

/**
 * Subscribe to the authenticated SSE notification stream.
 * Automatically sends Authorization: Bearer <token> via fetch.
 * Dispatches NOTIFICATION_CREATED and DATASET_INGESTED events.
 *
 * @param {Object} [callbacks]
 * @param {(data: any) => void} [callbacks.onNotification]
 * @param {(data: any) => void} [callbacks.onDatasetIngested]
 * @param {(err: Error) => void} [callbacks.onError]
 * @returns {() => void} unsubscribe cleanup function
 */
export function subscribeNotificationStream({ onNotification, onDatasetIngested, onError } = {}) {
  const controller = new AbortController();
  let isClosed = false;

  async function connect() {
    const token = getAccessToken();
    if (!token || isClosed) return;

    try {
      const url = buildUrl("/notifications/stream");
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "text/event-stream",
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        if (response.status === 401 && onError) {
          onError(new Error("Unauthorized"));
          return;
        }
        throw new Error(`SSE stream error: ${response.status}`);
      }

      if (!response.body) return;
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (!isClosed) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() || "";

        for (const block of parts) {
          if (!block.trim()) continue;
          let eventType = "message";
          let dataStr = "";

          for (const line of block.split("\n")) {
            if (line.startsWith("event:")) {
              eventType = line.replace(/^event:\s*/, "").trim();
            } else if (line.startsWith("data:")) {
              const d = line.replace(/^data:\s*/, "");
              dataStr += (dataStr ? "\n" : "") + d;
            }
          }

          if (eventType === "NOTIFICATION_CREATED" && onNotification) {
            try {
              onNotification(dataStr ? JSON.parse(dataStr) : {});
            } catch {
              onNotification({});
            }
          } else if (eventType === "DATASET_INGESTED" && onDatasetIngested) {
            try {
              onDatasetIngested(dataStr ? JSON.parse(dataStr) : {});
            } catch {
              onDatasetIngested({});
            }
          }
        }
      }
    } catch {
      // Reconnect after 3s on transient disconnect if not intentionally closed
      if (!isClosed && !controller.signal.aborted) {
        setTimeout(connect, 3000);
      }
    }
  }

  connect();

  return () => {
    isClosed = true;
    controller.abort();
  };
}
