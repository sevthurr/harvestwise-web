/**
 * Supabase client used exclusively as the Google OAuth broker.
 *
 * The backend never sees Google tokens: Supabase performs the OAuth dance and
 * the frontend forwards the Supabase-issued JWT (`session.access_token`) to
 * `POST /api/v1/auth/google`, where it is verified against the Supabase JWKS.
 *
 * Uses the Authorization Code + PKCE flow without automatic URL detection —
 * the auth code is exchanged explicitly via `exchangeCodeForSession`.
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * sessionStorage when the browser exposes it, otherwise `undefined` so
 * auth-js falls back to its own default. Access can throw in some privacy
 * modes, which is why it is guarded.
 */
function authStorage() {
  try {
    return globalThis.sessionStorage ?? undefined;
  } catch {
    return undefined;
  }
}

export const supabase =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          flowType: "pkce",
          detectSessionInUrl: false,
          // The PKCE code verifier is written to the auth storage and must
          // survive the full-page redirect to Google and back. With
          // `persistSession: false`, auth-js swaps in an in-memory adapter
          // (and ignores a custom `storage`), so the verifier is gone by the
          // time the callback runs and `exchangeCodeForSession` fails with
          // "PKCE code verifier not found in storage". Persistence stays on,
          // but scoped to sessionStorage: it is per-tab and dropped when the
          // tab closes, and the Supabase session it stores is cleared right
          // after the exchange (see useGoogleAuth). That keeps a Supabase
          // session JWT out of localStorage, so no durable second credential
          // is left on the device.
          persistSession: true,
          storage: authStorage(),
          autoRefreshToken: false,
        },
      })
    : null;

/**
 * Read the one-time PKCE auth code appended by Supabase after the Google
 * redirect. GoTrue may append it to either the query string or the URL hash.
 */
export function getAuthCodeFromUrl() {
  const query = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return query.get("code") ?? hash.get("code");
}

/** Strip the code/state params from the URL without reloading the page. */
export function clearAuthCodeFromUrl() {
  const url = new URL(window.location.href);
  url.hash = "";
  url.searchParams.delete("code");
  url.searchParams.delete("state");
  window.history.replaceState({}, document.title, `${url.pathname}${url.search}`);
}