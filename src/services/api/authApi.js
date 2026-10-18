import { apiPost, apiFetch, apiGet, apiPut, apiDelete, parseResponse } from "../../app/global/api";

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

// ---------------------------------------------------------------------------
// Google OAuth (Supabase-brokered)
// `idToken` is the Supabase-issued JWT (`session.access_token`) — verified by
// the backend against the Supabase JWKS, mapped to a local account.
// ---------------------------------------------------------------------------
export function googleSignIn(idToken) {
  return apiPost("/auth/google", { id_token: idToken });
}

export function googleConnect(idToken) {
  return apiPost("/auth/google/connect", { id_token: idToken });
}

export async function listAuthLinks() {
  return parseResponse(await apiGet("/auth-links"));
}

export function unlinkAuthLink(accountId) {
  return apiDelete(`/auth-links/${accountId}`);
}

// The avatar endpoint runs several *sequential* Cloudinary round-trips
// server-side before it answers, so it legitimately exceeds the shared 15s
// request default and used to fail with "Request timed out" while the upload
// was still in flight. Override the timeout per call instead of raising the
// global FETCH_TIMEOUT_MS — that default deliberately catches genuinely hung
// requests, and every other endpoint is expected to stay under it.
export async function uploadProfilePicture(file) {
  const form = new FormData();
  form.append("file", file);
  return parseResponse(await apiFetch("/auth/profile/picture", {
    method: "POST",
    body: form,
    timeoutMs: 45000,
  }));
}

// ---------------------------------------------------------------------------
// TOTP 2FA (Google Authenticator)
// ---------------------------------------------------------------------------
export function setupTotp() {
  return apiPost("/auth/totp/setup");
}

export function enableTotp(code) {
  return apiPost("/auth/totp/enable", { code });
}

export function verifyTotpLogin(mfaToken, code) {
  return apiPost("/auth/totp/verify-login", {
    mfa_token: mfaToken,
    code,
  });
}

export function disableTotp(password, code) {
  return apiPost("/auth/totp/disable", {
    password,
    code,
  });
}

export function recoverTotp(identifier, password, recoveryCode) {
  return apiPost("/auth/totp/recover", {
    identifier,
    password,
    recovery_code: recoveryCode,
  });
}

export function regenerateRecoveryCodes(code) {
  return apiPost("/auth/totp/recovery-codes/regenerate", { code });
}

// ---------------------------------------------------------------------------
// Gmail OTP (DFTC email-based 2FA)
// ---------------------------------------------------------------------------
export function requestEmailOtp(mfaToken) {
  return apiPost("/auth/otp/request", { mfa_token: mfaToken });
}

export function verifyEmailOtp(mfaToken, code) {
  return apiPost("/auth/otp/verify", { mfa_token: mfaToken, code });
}
