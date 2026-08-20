/**
 * Base API client for HarvestWise.
 *
 * - Attaches the access token from localStorage to every request.
 * - On 401, attempts a single token refresh then retries the original request.
 * - On second 401 (refresh also expired / revoked), clears storage and
 *   dispatches a custom "hw:auth:expired" event so AuthContext can log the
 *   user out without a circular import.
 */

const API_BASE = import.meta.env.VITE_API_URL ?? import.meta.env.VITE_API_BASE_URL?.replace(/\/api\/v1\/?$/, '') ?? 'http://localhost:8080';

const STORAGE = {
  ACCESS:  'hw_access_token',
  REFRESH: 'hw_refresh_token',
};

// ---------------------------------------------------------------------------
// Token helpers
// ---------------------------------------------------------------------------
export function getAccessToken()  { return localStorage.getItem(STORAGE.ACCESS); }
export function getRefreshToken() { return localStorage.getItem(STORAGE.REFRESH); }

export function storeTokens({ access_token, refresh_token }) {
  localStorage.setItem(STORAGE.ACCESS,  access_token);
  localStorage.setItem(STORAGE.REFRESH, refresh_token);
}

export function clearTokens() {
  localStorage.removeItem(STORAGE.ACCESS);
  localStorage.removeItem(STORAGE.REFRESH);
}

// ---------------------------------------------------------------------------
// Internal fetch with auth header
// ---------------------------------------------------------------------------
function authHeaders() {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function _fetch(url, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...authHeaders(),
    ...(options.headers ?? {}),
  };
  return fetch(`${API_BASE}${url}`, { ...options, headers });
}

// ---------------------------------------------------------------------------
// Refresh once, then retry. On second failure, force logout.
// ---------------------------------------------------------------------------
let _refreshing = false;
let _refreshQueue = [];

async function _refreshAndRetry(url, options) {
  // If a refresh is already in-flight, queue this request behind it.
  if (_refreshing) {
    return new Promise((resolve, reject) => {
      _refreshQueue.push({ resolve, reject, url, options });
    });
  }

  _refreshing = true;
  const refreshToken = getRefreshToken();

  try {
    const res = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!res.ok) throw new Error('refresh_failed');

    const data = await res.json();
    storeTokens(data);

    // Drain the queue — retry all waiting requests with the new token.
    _refreshQueue.forEach(({ resolve, reject, url: u, options: o }) => {
      _fetch(u, o).then(resolve).catch(reject);
    });
    _refreshQueue = [];

    // Retry the original request.
    return _fetch(url, options);
  } catch {
    clearTokens();
    window.dispatchEvent(new Event('hw:auth:expired'));
    _refreshQueue.forEach(({ reject }) => reject(new Error('Session expired')));
    _refreshQueue = [];
    throw new Error('Session expired. Please log in again.');
  } finally {
    _refreshing = false;
  }
}

// ---------------------------------------------------------------------------
// Public fetch wrapper
// ---------------------------------------------------------------------------
export async function apiFetch(url, options = {}) {
  const res = await _fetch(url, options);

  if (res.status === 401) {
    // Only attempt refresh if we actually have a refresh token.
    if (getRefreshToken()) {
      return _refreshAndRetry(url, options);
    }
    clearTokens();
    window.dispatchEvent(new Event('hw:auth:expired'));
    throw new Error('Not authenticated');
  }

  return res;
}

// ---------------------------------------------------------------------------
// Convenience wrappers
// ---------------------------------------------------------------------------
export async function apiGet(url, options = {}) {
  return apiFetch(url, { ...options, method: 'GET' });
}

export async function apiPost(url, body, options = {}) {
  return apiFetch(url, {
    ...options,
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function apiPut(url, body, options = {}) {
  return apiFetch(url, {
    ...options,
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

/**
 * Parse a response, throwing a structured error for non-2xx responses.
 * The error message is taken from the backend's `detail` field when present.
 */
export async function parseResponse(res) {
  if (res.ok) return res.json();
  let detail = `Request failed (${res.status})`;
  try {
    const body = await res.json();
    if (body?.detail) detail = body.detail;
  } catch { /* ignore parse error */ }
  const err = new Error(detail);
  err.status = res.status;
  throw err;
}
