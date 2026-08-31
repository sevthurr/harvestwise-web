import { apiGet, apiPost, apiPut, apiFetch, parseResponse } from "../../app/global/api";

// ── Weights ────────────────────────────────────────────────────────────────
export async function listWeights() {
  return parseResponse(await apiGet("/admin/weights"));
}

export async function getWeight(weightId) {
  return parseResponse(await apiGet(`/admin/weights/${weightId}`));
}

export async function createWeight(payload) {
  return parseResponse(await apiPost("/admin/weights", payload));
}

export async function updateWeight(weightId, payload) {
  return parseResponse(await apiPut(`/admin/weights/${weightId}`, payload));
}

// ── Thresholds (modules + rules) ───────────────────────────────────────────
export async function listThresholds() {
  return parseResponse(await apiGet("/admin/thresholds"));
}

export async function createThreshold(payload) {
  return parseResponse(await apiPost("/admin/thresholds", payload));
}

export async function updateThreshold(moduleId, payload) {
  return parseResponse(await apiPut(`/admin/thresholds/${moduleId}`, payload));
}

export async function deleteThreshold(moduleId) {
  return parseResponse(
    await apiFetch(`/admin/thresholds/${moduleId}`, { method: "DELETE" })
  );
}

export async function listThresholdRules(moduleId) {
  return parseResponse(await apiGet(`/admin/thresholds/${moduleId}/rules`));
}

export async function createThresholdRule(moduleId, payload) {
  return parseResponse(await apiPost(`/admin/thresholds/${moduleId}/rules`, payload));
}

export async function updateThresholdRule(ruleId, payload) {
  return parseResponse(await apiPut(`/admin/thresholds/rules/${ruleId}`, payload));
}

export async function deleteThresholdRule(ruleId) {
  return parseResponse(
    await apiFetch(`/admin/thresholds/rules/${ruleId}`, { method: "DELETE" })
  );
}

// ── Computations ───────────────────────────────────────────────────────────
export async function runPriceChange(payload) {
  return parseResponse(await apiPost("/computations/price-change", payload));
}

export async function runPriceOutlook(payload) {
  return parseResponse(await apiPost("/computations/price-outlook", payload));
}

export async function runArrivalPressure(payload) {
  return parseResponse(await apiPost("/computations/arrival-pressure", payload));
}

export async function runSeasonalProduction(payload) {
  return parseResponse(await apiPost("/computations/seasonal-production", payload));
}

export async function runProfitability(payload) {
  return parseResponse(await apiPost("/computations/profitability", payload));
}

export async function runRecommendation(payload) {
  return parseResponse(await apiPost("/computations/recommendation", payload));
}

// ── Farmer commodities (analytics scoping) ─────────────────────────────────
export async function listCommodities() {
  return parseResponse(await apiGet("/farmer/commodities"));
}
