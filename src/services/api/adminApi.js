import { apiGet, parseResponse } from "../../app/global/api";

export async function getDashboard() {
  return parseResponse(await apiGet("/admin/dashboard"));
}

export async function getDataSourceRecords(sourceId, params = {}) {
  const qs = new URLSearchParams(params).toString();
  return parseResponse(await apiGet(`/admin/data-sources/${sourceId}/records${qs ? `?${qs}` : ""}`));
}
