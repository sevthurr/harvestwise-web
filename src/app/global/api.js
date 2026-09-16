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

// Hard cap so a flaky/offline connection can never leave the app stuck in the
// loading state. Requests that time out reject (caught by query error handling)
// instead of hanging forever.
const FETCH_TIMEOUT_MS = 15000;

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

function buildUrl(url) {
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const path = url.startsWith('/') ? url : `/${url}`;
  if (path.startsWith('/api/v1')) {
    return `${API_BASE}${path}`;
  }
  return `${API_BASE}/api/v1${path}`;
}

// fetch() with a hard timeout. Combines any caller-supplied signal with an
// internal abort timer so a hung request always settles.
function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort(new DOMException('Request timed out', 'TimeoutError'));
  }, FETCH_TIMEOUT_MS);

  const external = options.signal;
  if (external) {
    if (external.aborted) controller.abort(external.reason);
    else external.addEventListener('abort', () => controller.abort(external.reason), { once: true });
  }

  return fetch(url, { ...options, signal: controller.signal }).finally(() => {
    clearTimeout(timeoutId);
  });
}

async function _fetch(url, options = {}) {
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const headers = {
    ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
    ...authHeaders(),
    ...(options.headers ?? {}),
  };
  if (isFormData) {
    delete headers['Content-Type'];
    delete headers['content-type'];
  }
  return fetchWithTimeout(buildUrl(url), { ...options, headers });
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
    const res = await fetchWithTimeout(`${API_BASE}/api/v1/auth/refresh`, {
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
  } catch (err) {
    // Only clear tokens if the refresh actually failed (not a network error)
    // Network errors mean we're offline — keep tokens for when we reconnect
    if (err.message === 'refresh_failed') {
      clearTokens();
      window.dispatchEvent(new Event('hw:auth:expired'));
      _refreshQueue.forEach(({ reject }) => reject(new Error('Session expired')));
      _refreshQueue = [];
      throw new Error('Session expired. Please log in again.');
    }
    // Network error — don't clear tokens, just fail this request
    _refreshQueue.forEach(({ reject }) => reject(err));
    _refreshQueue = [];
    throw err;
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
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  return apiFetch(url, {
    ...options,
    method: 'POST',
    body: isFormData ? body : JSON.stringify(body),
  });
}

export async function apiPut(url, body, options = {}) {
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  return apiFetch(url, {
    ...options,
    method: 'PUT',
    body: isFormData ? body : JSON.stringify(body),
  });
}

export async function apiDelete(url, options = {}) {
  return apiFetch(url, { ...options, method: 'DELETE' });
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
