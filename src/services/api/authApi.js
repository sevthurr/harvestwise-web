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
