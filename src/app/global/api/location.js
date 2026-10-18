import { apiGet, parseResponse } from "../api";

/**
 * Fetch all 182 Davao City Barangays from the backend PSGC catalog.
 * @returns {Promise<Array<{code: string, name: string}>>}
 */
export async function getDavaoCityBarangays() {
  const res = await apiGet("/location/davao-city/barangays");
  if (!res.ok) {
    throw new Error("Failed to load Davao City barangays");
  }
  const data = await parseResponse(res);
  return data?.items || [];
}

/**
 * Forward geocode a selected Davao City Barangay and optional specific farm address to coordinates.
 * @param {string} barangay
 * @param {string|null} [address]
 * @returns {Promise<{city: string, barangay: string, latitude: number, longitude: number, specific_address: string|null, display_address: string, is_specific: boolean}>}
 */
export async function geocodeBarangay(barangay, address = null, district = null, purokSitio = null, street = null) {
  let url = `/location/geocode?barangay=${encodeURIComponent(barangay)}`;
  if (address && address.trim()) {
    url += `&address=${encodeURIComponent(address.trim())}`;
  }
  if (district && district.trim()) {
    url += `&district=${encodeURIComponent(district.trim())}`;
  }
  if (purokSitio && purokSitio.trim()) {
    url += `&purok_sitio=${encodeURIComponent(purokSitio.trim())}`;
  }
  if (street && street.trim()) {
    url += `&street=${encodeURIComponent(street.trim())}`;
  }
  const res = await apiGet(url);
  return await parseResponse(res);
}

/**
 * Reverse geocode coordinates to a readable City and Barangay.
 * @param {number} latitude
 * @param {number} longitude
 * @returns {Promise<{is_davao_city: boolean, city: string, barangay: string|null, psgc_code: string|null, latitude: number, longitude: number, message: string|null}>}
 */
export async function reverseGeocodeCoordinates(latitude, longitude) {
  const res = await apiGet(`/location/reverse-geocode?latitude=${latitude}&longitude=${longitude}`);
  if (!res.ok) {
    throw new Error("Failed to reverse geocode coordinates");
  }
  return await parseResponse(res);
}
