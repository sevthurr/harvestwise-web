import { apiPost, apiGet, apiFetch, parseResponse } from "../../app/global/api";

export async function uploadFile(file, dataType, overwrite = false) {
  const form = new FormData();
  form.append("file", file);
  if (dataType) {
    form.append("data_type", dataType);
  }
  form.append("overwrite", String(overwrite));
  return parseResponse(
    await apiFetch("/admin/ingestion/upload", {
      method: "POST",
      body: form,
    })
  );
}

export async function getHistory(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return parseResponse(await apiGet(`/admin/ingestion/history${qs ? `?${qs}` : ""}`));
}

export async function getHistoryDetail(importId) {
  return parseResponse(await apiGet(`/admin/ingestion/history/${importId}`));
}

export async function retryImport(payload) {
  return parseResponse(await apiPost("/admin/ingestion/retry", payload));
}

export async function syncNow() {
  return parseResponse(await apiPost("/admin/ingestion/sync", {}));
}
