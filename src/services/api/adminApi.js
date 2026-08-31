import { apiGet, apiPost, apiPut, apiDelete, parseResponse } from "../../app/global/api";

export async function getDashboard() {
  return parseResponse(await apiGet("/admin/dashboard"));
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
