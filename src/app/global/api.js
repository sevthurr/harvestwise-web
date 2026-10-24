/**
 * Base API client for HarvestWise.
 *
 * - Keeps authentication state in HttpOnly cookies; JavaScript never receives
 *   or stores access/refresh token values.
 * - On 401, attempts a single token refresh then retries the original request.
 * - On second 401 (refresh also expired / revoked), clears storage and
 *   dispatches a custom "hw:auth:expired" event so AuthContext can log the
 *   user out without a circular import. Only an established cookie session is
 *   treated as expired; an anonymous 401 stays silent.
 */

const API_BASE = import.meta.env.VITE_API_URL ?? import.meta.env.VITE_API_BASE_URL?.replace(/\/api\/v1\/?$/, '') ?? 'http://localhost:8080';

// Hard cap so a flaky/offline connection can never leave the app stuck in the
// loading state. Requests that time out reject (caught by query error handling)
// instead of hanging forever.
const FETCH_TIMEOUT_MS = 15000;

let sessionActive = false;

// ---------------------------------------------------------------------------
// Token helpers
// ---------------------------------------------------------------------------
export function getAccessToken() { return null; }
export function getRefreshToken() { return null; }
export function markSessionActive() { sessionActive = true; }

function announceSessionChange() {
  try {
    localStorage.setItem('hw_session_generation', `${Date.now()}-${Math.random()}`);
  } catch {}
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('hw:session:changed'));
}

function sessionGeneration() {
  try { return localStorage.getItem('hw_session_generation') || 'anonymous'; } catch { return 'anonymous'; }
}

export function storeTokens(_legacySession = null) {
  // Compatibility shim for callers released before cookie-only auth. The
  // values are intentionally ignored; the server sets HttpOnly cookies.
  void _legacySession;
  sessionActive = true;
}

export function clearTokens() {
  sessionActive = false;
  announceSessionChange();
}

function csrfToken() {
  if (typeof document === 'undefined') return '';
  return document.cookie.split('; ').find((part) => part.startsWith('hw_csrf_token='))?.split('=').slice(1).join('=') || '';
}

/**
 * Auth failure. Tagged with status: 401 so queryClient's retry predicate can
 * tell "the session is gone" apart from a transient network/server error, and
 * fail fast instead of retrying a request that can never succeed.
 */
function authError(message) {
  const err = new Error(message);
  err.status = 401;
  return err;
}

// ---------------------------------------------------------------------------
// Internal fetch with cookie credentials
// ---------------------------------------------------------------------------
export function buildUrl(url) {
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
  // Per-call override for endpoints that are known to be slower than the
  // global default. Raising the global value is not an option: it would mask
  // genuinely hung requests.
  const timeoutMs = options.timeoutMs ?? FETCH_TIMEOUT_MS;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort(new DOMException('Request timed out', 'TimeoutError'));
  }, timeoutMs);

  const external = options.signal;
  if (external) {
    if (external.aborted) controller.abort(external.reason);
    else external.addEventListener('abort', () => controller.abort(external.reason), { once: true });
  }

  const { timeoutMs: _ignored, ...fetchOptions } = options;
  const generation = sessionGeneration();
  return fetch(url, { ...fetchOptions, signal: controller.signal }).then((response) => {
    if (generation !== sessionGeneration()) {
      controller.abort(new DOMException('Session changed', 'AbortError'));
      throw new DOMException('Session changed', 'AbortError');
    }
    return response;
  }).finally(() => {
    clearTimeout(timeoutId);
  });
}

/** Kept as a no-op compatibility entry point for older auth-context builds. */
export async function completeLegacyTokenMigration() {
  return undefined;
}

async function _fetch(url, options = {}) {
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const headers = {
    ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers ?? {}),
  };
  const method = (options.method || 'GET').toUpperCase();
  const csrf = csrfToken();
  if (csrf && !['GET', 'HEAD', 'OPTIONS'].includes(method)) headers['X-CSRF-Token'] = csrf;
  if (isFormData) {
    delete headers['Content-Type'];
    delete headers['content-type'];
  }
  let requestUrl = buildUrl(url);
  if (method === 'GET' && requestUrl.includes('/api/v1/')) {
    const separator = requestUrl.includes('?') ? '&' : '?';
    requestUrl = `${requestUrl}${separator}hw_session_generation=${encodeURIComponent(sessionGeneration())}`;
  }
  return fetchWithTimeout(requestUrl, { ...options, credentials: 'include', headers });
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
  try {
    const res = await fetchWithTimeout(`${API_BASE}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
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
      _refreshQueue.forEach(({ reject }) => reject(authError('Session expired')));
      _refreshQueue = [];
      throw authError('Session expired. Please log in again.');
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
  // Must be read BEFORE the request: a 401 on an anonymous request (e.g. a
  // pre-login /crop-plans probe) is not an expired session, so it must not
  // clear tokens or fire hw:auth:expired.
  const hadAuth = sessionActive;
  const res = await _fetch(url, options);

  if (res.status === 401) {
    // Only attempt refresh if we actually have a refresh token.
    if (sessionActive) {
      return _refreshAndRetry(url, options);
    }
    if (hadAuth) {
      // The request carried a token and still got a 401 — session genuinely died.
      clearTokens();
      window.dispatchEvent(new Event('hw:auth:expired'));
    }
    throw authError('Not authenticated');
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

export async function apiPatch(url, body, options = {}) {
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  return apiFetch(url, {
    ...options,
    method: 'PATCH',
    body: isFormData ? body : JSON.stringify(body),
  });
}

export async function apiDelete(url, options = {}) {
  return apiFetch(url, { ...options, method: 'DELETE' });
}

/**
 * Open an authenticated Server-Sent Events stream.
 *
 * Native `EventSource` cannot send an Authorization header, so it cannot be
 * used against a bearer-authenticated API. This wrapper drives the same SSE
 * protocol over `fetch` + a ReadableStream, which can attach the access token
 * the same way every other request does. It refreshes once on a 401 and then
 * reconnects, so a rotated token does not permanently kill the stream.
 *
 * Handlers are registered by event name and receive the parsed `data` payload
 * plus the SSE event name as a second argument. The key `*` matches any event
 * that has no specific handler. `ping` keep-alives are consumed internally and
 * not surfaced.
 *
 * @param {string} path                 API path, e.g. '/notifications/stream'
 * @param {Record<string, (data:any, eventName:string)=>void>} handlers
 *        keyed by SSE event name, or `*` for a catch-all
 * @param {{ signal?: AbortSignal }} options
 * @returns {{ close: () => void }}
 */
export function openEventStream(path, handlers = {}, options = {}) {
  let closed = false;
  let controller = null;
  const external = options.signal;
  const abort = () => {
    closed = true;
    controller?.abort();
    window.removeEventListener('hw:session:changed', abort);
  };
  window.addEventListener('hw:session:changed', abort, { once: true });
  if (external) {
    if (external.aborted) abort();
    else external.addEventListener('abort', abort, { once: true });
  }

  const run = async () => {
    // Reconnect with a bounded backoff. A closed or reset stream is normal on
    // flaky rural connectivity, so this is a retry loop rather than an error.
    let backoff = 1000;
    while (!closed) {
      try {
        // Raw fetch, not fetchWithTimeout: the request here is intentionally
        // long-lived, so the shared request timeout must not abort it. The
        // stream is bounded by our own AbortController instead.
        const streamUrl = `${buildUrl(path)}${buildUrl(path).includes('?') ? '&' : '?'}hw_session_generation=${encodeURIComponent(sessionGeneration())}`;
        const res = await fetch(streamUrl, {
          headers: { Accept: 'text/event-stream' },
          credentials: 'include',
          signal: controller.signal,
        });

        if (res.status === 401) {
          // Token expired mid-stream — refresh once, then let the loop retry.
          try {
            await _refreshAndRetry(path, { method: 'GET' });
          } catch {
            /* fall through; the next iteration will retry the stream */
          }
          await new Promise((r) => setTimeout(r, backoff));
          backoff = Math.min(backoff * 2, 30000);
          continue;
        }

        if (!res.ok || !res.body) {
          throw new Error(`stream_${res.status}`);
        }

        backoff = 1000;
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (!closed) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          // SSE frames are separated by a blank line. Anything before the last
          // blank line is a complete event; the remainder is a partial frame.
          let split;
          while ((split = buffer.indexOf('\n\n')) !== -1) {
            const frame = buffer.slice(0, split);
            buffer = buffer.slice(split + 2);

            let eventName = 'message';
            const dataLines = [];
            for (const line of frame.split('\n')) {
              if (line.startsWith('event:')) eventName = line.slice(6).trim();
              else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
            }
            if (eventName === 'ping' || dataLines.length === 0) continue;

            // A `*` handler receives every non-ping event, so a new server event
            // type does not require a client change to start flowing.
            const handler = handlers[eventName] || handlers['*'];
            if (!handler) continue;
            try {
              handler(JSON.parse(dataLines.join('\n')), eventName);
            } catch {
              /* a malformed frame must not kill the stream */
            }
          }
        }
      } catch {
        if (closed) return;
      }

      if (closed) return;
      await new Promise((r) => setTimeout(r, backoff));
      backoff = Math.min(backoff * 2, 30000);
    }
  };

  controller = new AbortController();
  run();

  return { close: abort };
}

/**
 * Resolve a stored media location (user.profile_picture_path) into a URL the
 * browser can load.
 *
 * Cloudinary is the only avatar backend, so the stored value is always an
 * absolute https URL. The legacy "/media/..." branch is kept for rows written
 * before the local-disk backend was removed — there is no /media route any more,
 * so those resolve to null and the caller falls back to the default avatar.
 * Do not re-point them at the API origin; the file is gone.
 */
export function resolveMediaUrl(location) {
  if (!location) return null;
  if (/^https?:\/\//i.test(location)) return location;
  return null;
}

/**
 * Parse a response, throwing a structured error for non-2xx responses.
 * The error message is taken from the backend's `detail` field when present.
 *
 * `detail` is only adopted when it is a string. FastAPI returns a *list* of
 * objects for 422 validation errors and a dict for some handlers, and
 * `new Error(object)` coerces through String() — the admin screens then showed
 * the literal "[object Object]" instead of a message, and because that string
 * is truthy it defeated every `err.message || "Unable to load ..."` fallback.
 */
export async function parseResponse(res) {
  if (res.ok) return res.json();
  let detail = `Request failed (${res.status})`;
  try {
    const body = await res.json();
    if (typeof body?.detail === "string" && body.detail.trim()) {
      detail = body.detail;
    } else if (Array.isArray(body?.detail) && body.detail.length) {
      // 422 validation errors: surface the field messages, not the objects.
      detail = body.detail
        .map((d) => {
          if (!d || typeof d !== "object") return String(d);
          const location = d.loc?.join(".") || "request";
          const message = String(d.msg || "invalid");
          if (
            location.split(".").includes("email") &&
            /valid email|special-use|reserved name|email address/i.test(message)
          ) {
            return "Enter a valid email address.";
          }
          return `${location}: ${message}`;
        })
        .join("; ");
    }
  } catch { /* ignore parse error */ }
  const err = new Error(detail);
  err.status = res.status;
  throw err;
}
