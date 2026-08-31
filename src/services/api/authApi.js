import { apiPost, apiFetch, apiPut, parseResponse } from "../../app/global/api";

export function login(payload) {
  return apiPost("/auth/login", payload);
}

export function register(payload) {
  return apiPost("/auth/register", payload);
}

export async function me() {
  return parseResponse(await apiFetch("/auth/me"));
}

export function updateProfile(payload) {
  return apiPut("/auth/me", payload);
}

export function changePassword(payload) {
  return apiPost("/auth/change-password", payload);
}

export function uploadProfilePicture(file) {
  const form = new FormData();
  form.append("file", file);
  return apiFetch("/auth/profile/picture", {
    method: "POST",
    body: form,
  });
}
