import { apiGet, apiPost, parseResponse } from "../../app/global/api";

export const NOTIFICATION_STALE_TIME = 5 * 60 * 1000;
export const STAFF_NOTIFICATION_KEY = ["staff-notifications"];
export const NOTIFICATION_KEYS = {
  farmer: ["farmer-notifications"],
  dftc: STAFF_NOTIFICATION_KEY,
  admin: STAFF_NOTIFICATION_KEY,
};

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

export function prefetchNotificationFeed(queryClient, role) {
  const queryKey = NOTIFICATION_KEYS[role];
  if (!queryKey) return Promise.resolve();
  return queryClient.prefetchQuery({
    queryKey,
    queryFn: () => listNotifications(1, 50),
    staleTime: NOTIFICATION_STALE_TIME,
  }).catch(() => {});
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
