/**
 * Auth flow tests: login, failed login, token restoration, logout,
 * onboarding submission.
 *
 * All HTTP calls are mocked via vi.stubGlobal('fetch', ...).
 * localStorage is cleared before each test.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router';

// ── Module under test ──────────────────────────────────────────────────────
import { AuthProvider, useAuth, roleHome } from '../app/global/contexts/AuthContext';
import {
  apiFetch,
  markSessionActive,
  storeTokens,
  clearTokens,
  getAccessToken,
  getRefreshToken,
} from '../app/global/api';

// ── Helpers ────────────────────────────────────────────────────────────────

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

const FAKE_USER_ADMIN = {
  ...FAKE_USER_FARMER,
  id: 'USR-0002',
  role: { id: 'ROL-0002', role_name: 'Admin' },
};

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

// Minimal component that exposes auth state for assertions
function AuthConsumer({ onRender }) {
  const auth = useAuth();
  onRender?.(auth);
  return <div data-testid="user">{auth.user?.email ?? 'none'}</div>;
}

function renderWithAuth(ui, { initialEntries = ['/'] } = {}) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <AuthProvider>{ui}</AuthProvider>
    </MemoryRouter>
  );
}

// ── Setup / teardown ────────────────────────────────────────────────────────

beforeEach(() => {
  localStorage.clear();
  clearTokens();
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ── roleHome ────────────────────────────────────────────────────────────────

describe('roleHome()', () => {
  it('maps Farmer → /farmer', () => expect(roleHome('Farmer')).toBe('/farmer'));
  it('maps Admin → /admin',   () => expect(roleHome('Admin')).toBe('/admin'));
  it('maps SuperAdmin → /admin', () => expect(roleHome('SuperAdmin')).toBe('/admin'));
  it('maps DFTC → /dftc',    () => expect(roleHome('DFTC')).toBe('/dftc'));
  it('defaults unknown → /farmer', () => expect(roleHome(null)).toBe('/farmer'));
});

// ── Token helpers ────────────────────────────────────────────────────────────

describe('token helpers', () => {
  it('storeTokens never exposes tokens to JavaScript or browser storage', () => {
    storeTokens(FAKE_TOKENS);
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
    expect(localStorage.getItem('hw_access_token')).toBeNull();
    expect(localStorage.getItem('hw_refresh_token')).toBeNull();
  });

  it('clearTokens removes both tokens', () => {
    storeTokens(FAKE_TOKENS);
    clearTokens();
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });
});

// ── AuthContext: no stored token ─────────────────────────────────────────────

describe('AuthContext — no stored tokens', () => {
  it('starts unauthenticated, loading=false', async () => {
    vi.stubGlobal('fetch', mockFetch({ ok: false, status: 401, body: { detail: 'Not authenticated' } }));

    let capturedAuth;
    renderWithAuth(<AuthConsumer onRender={(a) => { capturedAuth = a; }} />);

    await waitFor(() => expect(capturedAuth?.loading).toBe(false));
    expect(capturedAuth.isLoggedIn).toBe(false);
    expect(capturedAuth.user).toBeNull();
  });
});

// ── AuthContext: restore session from stored tokens ──────────────────────────

describe('AuthContext — token restoration', () => {
  it('does not log out when refresh is temporarily rejected with 403', async () => {
    markSessionActive();
    const expired = vi.fn();
    window.addEventListener('hw:auth:expired', expired);
    vi.stubGlobal('fetch', mockFetch([
      { ok: false, status: 401, body: { detail: 'Token expired' } },
      { ok: false, status: 403, body: { detail: 'Refresh temporarily rejected' } },
    ]));

    await expect(apiFetch('/admin/dashboard')).rejects.toMatchObject({ status: 403 });
    expect(expired).not.toHaveBeenCalled();
    window.removeEventListener('hw:auth:expired', expired);
  });

  it('restores user from stored access token via GET /me', async () => {
    storeTokens(FAKE_TOKENS);

    vi.stubGlobal('fetch', mockFetch({ ok: true, status: 200, body: FAKE_USER_FARMER }));

    let capturedAuth;
    renderWithAuth(<AuthConsumer onRender={(a) => { capturedAuth = a; }} />);

    await waitFor(() => expect(capturedAuth?.loading).toBe(false));
    expect(capturedAuth.isLoggedIn).toBe(true);
    expect(capturedAuth.user.email).toBe('juan@example.com');
    expect(capturedAuth.user.role.role_name).toBe('Farmer');
  });

  it('clears tokens and stays unauthenticated when /me returns 401', async () => {
    storeTokens(FAKE_TOKENS);

    // First call: /me → 401, second (from 401 handler refresh attempt): 401 again
    vi.stubGlobal('fetch', mockFetch([
      { ok: false, status: 401, body: { detail: 'Token has expired' } },
      { ok: false, status: 401, body: { detail: 'refresh_failed' } },
    ]));

    let capturedAuth;
    renderWithAuth(<AuthConsumer onRender={(a) => { capturedAuth = a; }} />);

    await waitFor(() => expect(capturedAuth?.loading).toBe(false));
    expect(capturedAuth.isLoggedIn).toBe(false);
    expect(getAccessToken()).toBeNull();
  });

  it('restores the bounded identity cache only after a network failure', async () => {
    vi.stubGlobal('fetch', mockFetch({ ok: true, status: 200, body: FAKE_USER_FARMER }));
    let firstAuth;
    const first = renderWithAuth(<AuthConsumer onRender={(a) => { firstAuth = a; }} />);
    await waitFor(() => expect(firstAuth?.loading).toBe(false));
    first.unmount();

    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    let offlineAuth;
    renderWithAuth(<AuthConsumer onRender={(a) => { offlineAuth = a; }} />);
    await waitFor(() => expect(offlineAuth?.loading).toBe(false));
    expect(offlineAuth.user.email).toBe('juan@example.com');
  });

  it('does not restore cached identity after an authentication failure', async () => {
    vi.stubGlobal('fetch', mockFetch({ ok: true, status: 200, body: FAKE_USER_FARMER }));
    let firstAuth;
    const first = renderWithAuth(<AuthConsumer onRender={(a) => { firstAuth = a; }} />);
    await waitFor(() => expect(firstAuth?.loading).toBe(false));
    first.unmount();

    vi.stubGlobal('fetch', mockFetch({ ok: false, status: 401, body: { detail: 'Not authenticated' } }));
    let failedAuth;
    renderWithAuth(<AuthConsumer onRender={(a) => { failedAuth = a; }} />);
    await waitFor(() => expect(failedAuth?.loading).toBe(false));
    expect(failedAuth.user).toBeNull();
  });
});

// ── login() ──────────────────────────────────────────────────────────────────

describe('AuthContext — login()', () => {
  it('stores tokens and sets user after successful login', async () => {
    // login() calls storeTokens then GET /me
    vi.stubGlobal('fetch', mockFetch({ ok: true, status: 200, body: FAKE_USER_FARMER }));

    // Render with no stored tokens so loading resolves immediately
    let capturedAuth;
    renderWithAuth(<AuthConsumer onRender={(a) => { capturedAuth = a; }} />);
    await waitFor(() => expect(capturedAuth?.loading).toBe(false));

    await act(async () => {
      await capturedAuth.login(FAKE_TOKENS);
    });

    expect(getAccessToken()).toBeNull();
    expect(capturedAuth.isLoggedIn).toBe(true);
    expect(capturedAuth.user.email).toBe('juan@example.com');
  });
});

// ── logout() ─────────────────────────────────────────────────────────────────

describe('AuthContext — logout()', () => {
  it('calls POST /auth/logout, clears tokens, and sets user to null', async () => {
    storeTokens(FAKE_TOKENS);

    // /me succeeds → user logged in; POST /logout → 204
    vi.stubGlobal('fetch', mockFetch([
      { ok: true,  status: 200, body: FAKE_USER_FARMER },
      { ok: true,  status: 204, body: null },
    ]));

    let capturedAuth;
    renderWithAuth(<AuthConsumer onRender={(a) => { capturedAuth = a; }} />);
    await waitFor(() => expect(capturedAuth?.loading).toBe(false));
    expect(capturedAuth.isLoggedIn).toBe(true);

    await act(async () => {
      await capturedAuth.logout();
    });

    expect(capturedAuth.isLoggedIn).toBe(false);
    expect(capturedAuth.user).toBeNull();
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });

  it('clears local state when POST /logout fails offline', async () => {
    storeTokens(FAKE_TOKENS);

    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => FAKE_USER_FARMER })
      .mockRejectedValueOnce(new TypeError('Failed to fetch'));
    vi.stubGlobal('fetch', fetchMock);

    let capturedAuth;
    renderWithAuth(<AuthConsumer onRender={(a) => { capturedAuth = a; }} />);
    await waitFor(() => expect(capturedAuth?.loading).toBe(false));

    await act(async () => {
      await capturedAuth.logout();
    });

    expect(capturedAuth.isLoggedIn).toBe(false);
    expect(getAccessToken()).toBeNull();
  });

  it('logs out locally offline and flushes the server logout after reconnecting', async () => {
    storeTokens(FAKE_TOKENS);
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => FAKE_USER_FARMER })
      .mockResolvedValueOnce({ ok: true, status: 204, json: async () => null });
    vi.stubGlobal('fetch', fetchMock);

    let capturedAuth;
    renderWithAuth(<AuthConsumer onRender={(a) => { capturedAuth = a; }} />);
    await waitFor(() => expect(capturedAuth?.loading).toBe(false));
    vi.stubGlobal('navigator', { onLine: false });

    await act(async () => { await capturedAuth.logout(); });
    expect(capturedAuth.isLoggedIn).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    vi.stubGlobal('navigator', { onLine: true });
    await act(async () => { window.dispatchEvent(new Event('online')); });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(localStorage.getItem('hw_logout_pending')).toBeNull();
  });
});

// ── hw:auth:expired event ────────────────────────────────────────────────────

describe('AuthContext — forced logout on hw:auth:expired', () => {
  it('clears user when hw:auth:expired is dispatched', async () => {
    storeTokens(FAKE_TOKENS);
    vi.stubGlobal('fetch', mockFetch({ ok: true, status: 200, body: FAKE_USER_FARMER }));

    let capturedAuth;
    renderWithAuth(<AuthConsumer onRender={(a) => { capturedAuth = a; }} />);
    await waitFor(() => expect(capturedAuth?.loading).toBe(false));
    expect(capturedAuth.isLoggedIn).toBe(true);

    act(() => {
      window.dispatchEvent(new Event('hw:auth:expired'));
    });

    await waitFor(() => expect(capturedAuth.isLoggedIn).toBe(false));
  });
});

// ── Admin role routing ────────────────────────────────────────────────────────

describe('AuthContext — admin role', () => {
  it('sets role_name=Admin from /me response', async () => {
    storeTokens(FAKE_TOKENS);
    vi.stubGlobal('fetch', mockFetch({ ok: true, status: 200, body: FAKE_USER_ADMIN }));

    let capturedAuth;
    renderWithAuth(<AuthConsumer onRender={(a) => { capturedAuth = a; }} />);
    await waitFor(() => expect(capturedAuth?.loading).toBe(false));

    expect(capturedAuth.user.role.role_name).toBe('Admin');
    expect(roleHome(capturedAuth.user.role.role_name)).toBe('/admin');
  });
});

// ── Farmer offline bundle is role-gated ──────────────────────────────────────
//
// /auth/me nests the role as { role: { role_name } }. Reading a top-level
// `role_name` returns undefined, and roleHome() defaults to '/farmer', so every
// role (DFTC/Admin) seeded the farmer bundle and 403'd on /farmer/daily-snapshot
// and /farmer/profile.

describe('AuthContext — farmer offline bundle gating', () => {
  const snapshotCalls = () =>
    fetch.mock.calls.filter(([url]) => String(url).includes('/farmer/daily-snapshot'));
  const profileCalls = () =>
    fetch.mock.calls.filter(([url]) => String(url).includes('/farmer/profile'));

  it('seeds the daily snapshot when a Farmer restores a session', async () => {
    storeTokens(FAKE_TOKENS);
    vi.stubGlobal('fetch', mockFetch({ ok: true, status: 200, body: FAKE_USER_FARMER }));

    let capturedAuth;
    renderWithAuth(<AuthConsumer onRender={(a) => { capturedAuth = a; }} />);
    await waitFor(() => expect(capturedAuth?.loading).toBe(false));

    await waitFor(() => expect(snapshotCalls().length).toBeGreaterThan(0));
  });

  it('does NOT seed the farmer bundle for a DFTC session', async () => {
    const dftcUser = { ...FAKE_USER_FARMER, role: { id: 'ROL-0003', role_name: 'DFTC' } };
    storeTokens(FAKE_TOKENS);
    vi.stubGlobal('fetch', mockFetch({ ok: true, status: 200, body: dftcUser }));

    let capturedAuth;
    renderWithAuth(<AuthConsumer onRender={(a) => { capturedAuth = a; }} />);
    await waitFor(() => expect(capturedAuth?.loading).toBe(false));

    // Give the (incorrect) async seed a chance to fire before asserting.
    await new Promise((r) => setTimeout(r, 50));
    expect(capturedAuth.user.role.role_name).toBe('DFTC');
    expect(snapshotCalls()).toHaveLength(0);
    expect(profileCalls()).toHaveLength(0);
  });

  it('does NOT seed the farmer bundle for an Admin session', async () => {
    storeTokens(FAKE_TOKENS);
    vi.stubGlobal('fetch', mockFetch({ ok: true, status: 200, body: FAKE_USER_ADMIN }));

    let capturedAuth;
    renderWithAuth(<AuthConsumer onRender={(a) => { capturedAuth = a; }} />);
    await waitFor(() => expect(capturedAuth?.loading).toBe(false));

    await new Promise((r) => setTimeout(r, 50));
    expect(snapshotCalls()).toHaveLength(0);
    expect(profileCalls()).toHaveLength(0);
  });

  it('does NOT seed the farmer bundle when the role is unreadable', async () => {
    // The bundle carries the farmer's own crop plans, and roleHome() maps an
    // unknown or missing role name to '/farmer'. A session whose role cannot
    // be read is not a farmer, so it must not seed the farmer bundle — and its
    // fallback path requests /crop-plans.
    const rolelessUser = { ...FAKE_USER_FARMER };
    delete rolelessUser.role;
    storeTokens(FAKE_TOKENS);
    vi.stubGlobal('fetch', mockFetch({ ok: true, status: 200, body: rolelessUser }));

    let capturedAuth;
    renderWithAuth(<AuthConsumer onRender={(a) => { capturedAuth = a; }} />);
    await waitFor(() => expect(capturedAuth?.loading).toBe(false));

    await new Promise((r) => setTimeout(r, 50));
    expect(snapshotCalls()).toHaveLength(0);
    expect(profileCalls()).toHaveLength(0);
  });
});
