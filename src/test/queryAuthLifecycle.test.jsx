/**
 * Query lifecycle around authentication.
 *
 * Covers the query/cache side of the login flow, which lives outside
 * AuthContext itself but is driven by it:
 *
 * - the pre-login /crop-plans 401 must not happen at all;
 * - a 401 must not strand the mounted CropsContext observer;
 * - a 401 must not be retried, since it can never succeed.
 *
 * See documentation/farmer-dashboard-skeleton-loader-stuck-2026-09-29.md
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor, act } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { AuthProvider, useAuth } from '../app/global/contexts/AuthContext';
import { apiGet, storeTokens, getAccessToken, getRefreshToken } from '../app/global/api';
import { CropsProvider, useCrops } from '../app/farmer/components/crops/CropsContext';
import { queryClient as appQueryClient, shouldRetry } from '../app/global/lib/queryClient';

// ── Fixtures ─────────────────────────────────────────────────────────────────

const FAKE_TOKENS = { access_token: 'acc.fake.token', refresh_token: 'ref.fake.token' };

const FAKE_USER_FARMER = {
  id: 'USR-0001',
  username: 'juan.delacruz',
  email: 'juan@example.com',
  phone: null,
  preferred_language: null,
  is_active: true,
  role: { id: 'ROL-0001', role_name: 'Farmer' },
  created_at: '2026-01-01T00:00:00Z',
};

const CROP_PLAN_401 = { ok: false, status: 401, body: { detail: 'Not authenticated' } };

const CROP_PLANS_OK = {
  crop_plans: [{ id: 'CP-0001', status: 'Planted', commodity: { id: 'C1', name: 'Rice' } }],
};

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Wrap a fetch response in a minimal Response-like object */
function mockFetch(responses) {
  let callIndex = 0;
  return vi.fn(async () => {
    const resp = Array.isArray(responses) ? responses[callIndex++ % responses.length] : responses;
    return {
      ok: resp.ok ?? true,
      status: resp.status ?? 200,
      json: async () => resp.body,
    };
  });
}

/** fetch stub: /auth/me and the farmer bundle succeed, /crop-plans 401s */
function mockFetchCropPlansUnauthorized() {
  return vi.fn(async (url) => {
    const u = String(url);
    if (u.includes('/crop-plans')) {
      return { ok: CROP_PLAN_401.ok, status: CROP_PLAN_401.status, json: async () => CROP_PLAN_401.body };
    }
    return { ok: true, status: 200, json: async () => (u.includes('/auth/me') ? FAKE_USER_FARMER : {}) };
  });
}

/**
 * Mount CropsProvider at the same position it occupies in App.jsx — above the
 * router, inside AuthProvider — so the pre-login /crop-plans behaviour is real.
 *
 * `client` defaults to an isolated client, but can be the real app queryClient
 * when a test needs to exercise the shipped retry policy.
 */
function renderWithCrops(onCrops, onAuth, client = new QueryClient({ defaultOptions: { queries: { retry: false } } })) {
  function CropsConsumer() {
    onCrops(useCrops());
    onAuth?.(useAuth());
    return null;
  }
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <AuthProvider>
          <CropsProvider>
            <CropsConsumer />
          </CropsProvider>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const cropPlanCalls = () =>
  fetch.mock.calls.filter(([url]) => String(url).includes('/crop-plans')).length;

const errWithStatus = (status) => Object.assign(new Error('boom'), { status });

// ── Setup / teardown ─────────────────────────────────────────────────────────

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ── Pre-login /crop-plans 401 no longer strands the crops observer ────────────
//
// CropsProvider sits above the router, so its query used to run on /login with no
// token. The 401 dispatched hw:auth:expired, whose handler called
// queryClient.clear() — destroying the query the mounted observer was attached
// to. The observer re-attached to an empty query that never refetched, leaving
// Dashboard's isLoading true forever.

describe('crops query pre-auth behaviour', () => {
  it('does NOT request /crop-plans before the user is authenticated', async () => {
    vi.stubGlobal('fetch', mockFetch({ ok: true, status: 200, body: FAKE_USER_FARMER }));

    let crops;
    renderWithCrops((c) => { crops = c; });

    // AuthProvider resolves "no stored token" synchronously; give React a beat.
    await new Promise((r) => setTimeout(r, 50));
    expect(cropPlanCalls()).toBe(0);
    expect(crops.loading).toBe(false);
  });

  it('fetches /crop-plans once the user is authenticated', async () => {
    storeTokens(FAKE_TOKENS);
    vi.stubGlobal('fetch', mockFetch({ ok: true, status: 200, body: FAKE_USER_FARMER }));

    renderWithCrops(() => {});

    await waitFor(() => expect(cropPlanCalls()).toBeGreaterThan(0));
  });

  it('settles isLoading to false when /crop-plans 401s (observer is not stranded)', async () => {
    storeTokens(FAKE_TOKENS);
    vi.stubGlobal('fetch', mockFetchCropPlansUnauthorized());

    let crops;
    renderWithCrops((c) => { crops = c; });

    // Pre-fix this never resolved: clear() stranded the mounted observer.
    await waitFor(() => expect(crops?.loading).toBe(false), { timeout: 3000 });
  });

  it('leaves isLoading false and refetches after a pre-login 401 + login', async () => {
    // Regression: the pre-login 401 used to dispatch hw:auth:expired, whose
    // handler called queryClient.clear() and destroyed the query the mounted
    // observer was attached to. The observer re-attached to an empty query that
    // was never refetched, so the dashboard rendered skeletons forever.
    let authed = false;
    vi.stubGlobal('fetch', vi.fn(async (url) => {
      const u = String(url);
      if (u.includes('/crop-plans')) {
        return authed
          ? { ok: true, status: 200, json: async () => CROP_PLANS_OK }
          : { ok: false, status: 401, json: async () => ({ detail: 'Not authenticated' }) };
      }
      if (u.includes('/auth/me')) return { ok: true, status: 200, json: async () => FAKE_USER_FARMER };
      return { ok: true, status: 200, json: async () => ({}) };
    }));

    let crops, auth;
    renderWithCrops((c) => { crops = c; }, (a) => { auth = a; });

    await waitFor(() => expect(auth?.loading).toBe(false));

    authed = true;
    await act(async () => { await auth.login(FAKE_TOKENS); });

    // Must settle AND actually deliver the plans — pre-fix it stayed empty forever.
    // Asserting isLoading alone is not enough: a stranded query is `pending` but
    // not `fetching`, so it already reports isLoading === false.
    await waitFor(() => expect(crops?.crops).toHaveLength(1), { timeout: 3000 });
    expect(crops.loading).toBe(false);
    expect(cropPlanCalls()).toBe(1);
  });

  it('a 401 WITH a token still dispatches hw:auth:expired', async () => {
    // Access token present, no refresh token -> no refresh attempt, forced logout.
    storeTokens(FAKE_TOKENS);
    localStorage.removeItem('hw_refresh_token');
    expect(getAccessToken()).toBe(FAKE_TOKENS.access_token);
    expect(getRefreshToken()).toBeNull();

    const onExpired = vi.fn();
    window.addEventListener('hw:auth:expired', onExpired);

    vi.stubGlobal('fetch', mockFetch({ ok: false, status: 401, body: { detail: 'Token has expired' } }));

    await expect(apiGet('/api/v1/crop-plans')).rejects.toThrow('Not authenticated');

    expect(onExpired).toHaveBeenCalledTimes(1);
    expect(getAccessToken()).toBeNull();
    window.removeEventListener('hw:auth:expired', onExpired);
  });

  it('a 401 WITHOUT a token does NOT dispatch hw:auth:expired', async () => {
    // Never signed in: no tokens, so this is an anonymous 401, not an expired
    // session. Dispatching here is what caused the pre-login clear() cascade.
    const onExpired = vi.fn();
    window.addEventListener('hw:auth:expired', onExpired);

    vi.stubGlobal('fetch', mockFetch({ ok: false, status: 401, body: { detail: 'Not authenticated' } }));

    await expect(apiGet('/api/v1/crop-plans')).rejects.toThrow('Not authenticated');

    expect(onExpired).not.toHaveBeenCalled();
    window.removeEventListener('hw:auth:expired', onExpired);
  });
});

// ── Auth failures are not retried ────────────────────────────────────────────
//
// queryClient previously used the TanStack default (3 retries, exponential
// backoff). A 401 can never succeed on retry — api.js has already cleared the
// tokens — so one expired session produced a burst of 401s in the network tab.

describe('auth failures are not retried', () => {
  it('shouldRetry skips 401 and 403 at any attempt count', () => {
    expect(shouldRetry(0, errWithStatus(401))).toBe(false);
    expect(shouldRetry(2, errWithStatus(401))).toBe(false);
    expect(shouldRetry(0, errWithStatus(403))).toBe(false);
  });

  it('shouldRetry skips the rest of the 4xx range', () => {
    [400, 404, 409, 422, 429].forEach((status) => {
      expect(shouldRetry(0, errWithStatus(status))).toBe(false);
    });
  });

  it('shouldRetry still retries network errors and 5xx', () => {
    expect(shouldRetry(0, new TypeError('Failed to fetch'))).toBe(true);
    expect(shouldRetry(1, errWithStatus(500))).toBe(true);
    expect(shouldRetry(2, errWithStatus(503))).toBe(true);
  });

  it('shouldRetry gives up after 3 attempts', () => {
    expect(shouldRetry(3, errWithStatus(500))).toBe(false);
  });

  it('a 401 is tagged with status so the predicate can see it', async () => {
    vi.stubGlobal('fetch', mockFetch({ ok: false, status: 401, body: { detail: 'Not authenticated' } }));

    const error = await apiGet('/api/v1/crop-plans').catch((e) => e);

    expect(error.message).toBe('Not authenticated');
    expect(error.status).toBe(401);
  });

  it('the real app queryClient stops after one /crop-plans request on a 401', async () => {
    // Uses the shipped queryClient so the default retry policy is what is tested.
    storeTokens(FAKE_TOKENS);
    localStorage.removeItem('hw_refresh_token');
    vi.stubGlobal('fetch', mockFetchCropPlansUnauthorized());

    appQueryClient.clear();

    let crops;
    renderWithCrops((c) => { crops = c; }, undefined, appQueryClient);

    await waitFor(() => expect(crops?.loading).toBe(false), { timeout: 3000 });

    // Two calls are expected: the original request, plus the single refetch that
    // resetQueries() issues from the forced-logout handler. What must not happen
    // is growth. The window has to outlast TanStack's first backoff step
    // (2^0 * 1000ms), otherwise the retries are simply not visible yet.
    await new Promise((r) => setTimeout(r, 1600));
    const settled = cropPlanCalls();
    expect(settled).toBeLessThanOrEqual(2);

    await new Promise((r) => setTimeout(r, 800));
    expect(cropPlanCalls()).toBe(settled);
  });
});
