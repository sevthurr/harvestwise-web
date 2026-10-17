/**
 * Regression: Google sign-in via Supabase must write the PKCE code verifier to
 * real (session) storage.
 *
 * With `persistSession: false`, auth-js installs an in-memory storage adapter
 * and ignores a custom `storage`, so the verifier is lost during the full-page
 * redirect to Google and `exchangeCodeForSession` fails with
 * "PKCE code verifier not found in storage". These tests pin the verifier to
 * sessionStorage and prove a fresh client (a simulated reload) can still
 * exchange the code.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// jsdom in this Node version does not always expose sessionStorage; mirror the
// localStorage polyfill in setup.js so supabaseClient has a real store.
if (typeof sessionStorage === "undefined" || sessionStorage === null) {
  const store = {};
  Object.defineProperty(globalThis, "sessionStorage", {
    value: {
      getItem: (k) => store[k] ?? null,
      setItem: (k, v) => {
        store[k] = String(v);
      },
      removeItem: (k) => {
        delete store[k];
      },
      clear: () => {
        Object.keys(store).forEach((k) => delete store[k]);
      },
      get length() {
        return Object.keys(store).length;
      },
      key: (i) => Object.keys(store)[i] ?? null,
    },
    writable: true,
  });
}

/** Import a fresh module instance so each call is a new `createClient`. */
async function loadSupabaseClient() {
  vi.resetModules();
  vi.stubEnv("VITE_SUPABASE_URL", "https://project.supabase.co");
  vi.stubEnv("VITE_SUPABASE_ANON_KEY", "anon-public-key");
  const mod = await import("../services/supabaseClient");
  return mod.supabase;
}

function sessionResponseBody() {
  return {
    access_token: "sb.session.access",
    refresh_token: "sb.session.refresh",
    token_type: "bearer",
    expires_in: 3600,
    user: { id: "USR-0001", email: "juan@example.com" },
  };
}

describe("supabaseClient PKCE verifier storage", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("writes the code verifier to sessionStorage, never localStorage", async () => {
    const supabase = await loadSupabaseClient();
    expect(supabase).not.toBeNull();

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: "https://app.example.com/login", skipBrowserRedirect: true },
    });
    expect(error).toBeNull();

    const url = new URL(data.url);
    expect(url.searchParams.get("provider")).toBe("google");
    expect(url.searchParams.get("code_challenge")).toBeTruthy();

    const verifierKey = `${supabase.auth.storageKey}-code-verifier`;
    expect(sessionStorage.getItem(verifierKey)).toBeTruthy();
    // No durable second credential anywhere on the device.
    expect(localStorage.getItem(verifierKey)).toBeNull();
  });

  it("exchanges the code after a reload because the verifier survived the redirect", async () => {
    const started = await loadSupabaseClient();
    await started.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: "https://app.example.com/login", skipBrowserRedirect: true },
    });
    expect(sessionStorage.getItem(`${started.auth.storageKey}-code-verifier`)).toBeTruthy();

    // Simulate the browser returning from Google: a brand-new client instance
    // reads only what is in sessionStorage.
    const reloaded = await loadSupabaseClient();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => sessionResponseBody(),
      }))
    );

    const { data, error } = await reloaded.auth.exchangeCodeForSession("one-time-auth-code");
    expect(error).toBeNull();
    expect(data.session.access_token).toBe("sb.session.access");
  });
});
