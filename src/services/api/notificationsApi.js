import { apiGet, apiPost, parseResponse } from "../../app/global/api";

/**
 * Fetch paginated farmer notifications.
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
 * Mark all farmer notifications as read.
 * @returns {Promise<{updated: number}>}
 */
export async function markAllRead() {
  const res = await apiPost("/me/notifications/read-all", {});
  return parseResponse(res);
}
