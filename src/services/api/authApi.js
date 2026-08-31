import { apiPost, apiFetch, apiPut } from "../../app/global/api";

export function login(payload) {
  return apiPost("/auth/login", payload);
}

export function register(payload) {
  return apiPost("/auth/register", payload);
}

export function me() {
  return apiFetch("/auth/me");
}

export function updateProfile(payload) {
  return apiPut("/auth/me", payload);
}

export function uploadProfilePicture(file) {
  const form = new FormData();
  form.append("file", file);
  return apiFetch("/auth/profile/picture", {
    method: "POST",
    body: form,
  });
}
