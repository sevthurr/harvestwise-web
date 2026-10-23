import { apiGet, parseResponse } from "../../app/global/api";

/**
 * Fetch the active commodity catalog — every commodity row, top-10 or not.
 * Requires DFTC-staff auth.
 * @returns {Promise<{items: Array<{id: string, name: string, variety: string | null, category: string | null, unit_of_measure: string | null, is_top10: boolean}>, total: number}>}
 */
export async function getCommodityCatalog() {
  return parseResponse(await apiGet("/dftc/commodities"));
}
