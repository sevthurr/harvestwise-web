import { apiGet, apiPost, parseResponse } from "../../app/global/api";

export async function getDataVersion() {
  return parseResponse(await apiGet("/dftc/data-version"));
}

/**
 * Fetch the active commodity catalog — every commodity row, top-10 or not.
 * Requires DFTC-staff auth.
 * @returns {Promise<{items: Array<{id: string, name: string, variety: string | null, category: string | null, unit_of_measure: string | null, is_top10: boolean}>, total: number}>}
 */
export async function getCommodityCatalog() {
  return parseResponse(await apiGet("/dftc/commodities"));
}

export async function getAuditLogs(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return parseResponse(await apiGet(`/dftc/audit-logs${qs ? `?${qs}` : ""}`));
}

export async function recordActivity(payload) {
  return parseResponse(await apiPost("/dftc/activity", payload));
}

export async function getEditApprovalRequests(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return parseResponse(await apiGet(`/dftc/edit-approval-requests${qs ? `?${qs}` : ""}`));
}

export async function approveEditApprovalRequest(id) {
  return parseResponse(await apiPost(`/dftc/edit-approval-requests/${id}/approve`, {}));
}

export async function rejectEditApprovalRequest(id, comment) {
  return parseResponse(await apiPost(`/dftc/edit-approval-requests/${id}/reject`, { comment }));
}

export const dftcApi = { getAuditLogs, recordActivity, getEditApprovalRequests, approveEditApprovalRequest, rejectEditApprovalRequest };
