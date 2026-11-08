import { apiGet, apiPost, parseResponse } from "../../app/global/api";

/**
 * Activity history for the signed-in farmer. The backend scopes rows to the
 * caller, so no user_id is ever sent from the client.
 */
export async function getMyActivities(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return parseResponse(await apiGet(`/farmer/activity${qs ? `?${qs}` : ""}`));
}

export async function recordActivity(payload) {
  return parseResponse(await apiPost("/farmer/activity", payload));
}
