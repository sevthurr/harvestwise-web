import { apiGet, parseResponse } from "../../app/global/api";

export async function getPriceList(params = {}) {
  const qs = new URLSearchParams();
  if (params.search) qs.set("search", params.search);
  if (params.page != null) qs.set("page", String(params.page));
  if (params.page_size != null) qs.set("page_size", String(params.page_size));
  if (params.is_top10 != null) qs.set("is_top10", String(params.is_top10));
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return parseResponse(await apiGet(`/prices${suffix}`));
}

export async function getPriceDetail(commodityId, params = {}) {
  const qs = new URLSearchParams();
  if (params.price_type) qs.set("price_type", params.price_type);
  if (params.horizon != null) qs.set("horizon", String(params.horizon));
  if (params.records_limit != null) qs.set("records_limit", String(params.records_limit));
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return parseResponse(await apiGet(`/prices/${commodityId}${suffix}`));
}
