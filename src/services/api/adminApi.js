import { apiGet, apiPost, apiPut, apiPatch, apiDelete, parseResponse } from "../../app/global/api";

export async function getDashboard(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return parseResponse(await apiGet(`/admin/dashboard${qs ? `?${qs}` : ""}`));
}

export async function listDataSources() {
  return parseResponse(await apiGet("/admin/data-sources"));
}

export async function listApiSyncSources() {
  return parseResponse(await apiGet("/admin/data-sources/sync"));
}

export async function getDataSourceRecords(sourceId, params = {}) {
  const qs = new URLSearchParams(params).toString();
  return parseResponse(await apiGet(`/admin/data-sources/${sourceId}/records${qs ? `?${qs}` : ""}`));
}

export async function getAuditLogs(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return parseResponse(await apiGet(`/admin/logs${qs ? `?${qs}` : ""}`));
}

export async function listUsers(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return parseResponse(await apiGet(`/admin/users${qs ? `?${qs}` : ""}`));
}

export async function getUser(userId) {
  return parseResponse(await apiGet(`/admin/users/${userId}`));
}

export async function createUser(payload) {
  return parseResponse(await apiPost("/admin/users", payload));
}

export async function updateUser(userId, payload) {
  return parseResponse(await apiPut(`/admin/users/${userId}`, payload));
}

export async function deactivateUser(userId) {
  return apiDelete(`/admin/users/${userId}`);
}

export async function getSystemHealth(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return parseResponse(await apiGet(`/admin/system/health${qs ? `?${qs}` : ""}`));
}

/**
 * Account removal requests. A non-SuperAdmin caller only receives their own
 * rows from the backend.
 */
export async function listRemovalRequests(params = {}) {
  // Drop null/undefined entries: URLSearchParams would serialise an absent
  // status filter as the literal string "status=undefined".
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null);
  const qs = new URLSearchParams(entries).toString();
  return parseResponse(await apiGet(`/dftc/removal-requests${qs ? `?${qs}` : ""}`));
}

export async function reviewRemovalRequest(requestId, payload) {
  return parseResponse(await apiPatch(`/dftc/removal-requests/${requestId}`, payload));
}

