/**
 * Account removal request flow — requester-visible state rule.
 *
 * Both the farmer and DFTC settings pages read their own
 * `GET /dftc/removal-requests` rows and must agree on which request is "the"
 * one and whether a new request may be submitted.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import {
  currentRemovalRequest,
  isRemovalBlocked,
  cancelRemovalRequest,
  useRemovalRequest,
} from '../app/global/hooks/useRemovalRequest';

const req = (id, status, requested_at) => ({ id, status, requested_at });

// api.js routes every call through global fetch. Reset between tests so a
// "was it called" assertion cannot see a previous test's mock.
beforeEach(() => {
  window.fetch = vi.fn();
});

describe('currentRemovalRequest', () => {
  it('prefers the newest still-open request over a newer decided one', () => {
    const items = [
      req('r3', 'rejected', '2026-10-05T00:00:00Z'),
      req('r1', 'pending', '2026-10-01T00:00:00Z'),
      req('r2', 'approved', '2026-10-03T00:00:00Z'),
    ];
    expect(currentRemovalRequest(items).id).toBe('r1');
  });

  it('treats submitted as open', () => {
    const items = [
      req('r1', 'rejected', '2026-10-04T00:00:00Z'),
      req('r2', 'submitted', '2026-10-02T00:00:00Z'),
    ];
    expect(currentRemovalRequest(items).id).toBe('r2');
  });

  it('falls back to the newest request when none is open (order not guaranteed)', () => {
    const items = [
      req('old', 'rejected', '2026-10-01T00:00:00Z'),
      req('new', 'rejected', '2026-10-04T00:00:00Z'),
    ];
    expect(currentRemovalRequest(items).id).toBe('new');
  });

  it('returns null for an empty or missing list', () => {
    expect(currentRemovalRequest([])).toBeNull();
    expect(currentRemovalRequest(undefined)).toBeNull();
    expect(currentRemovalRequest(null)).toBeNull();
  });

  it('does not mutate the caller array', () => {
    const items = [req('a', 'rejected', '2026-10-01T00:00:00Z'), req('b', 'pending', '2026-10-02T00:00:00Z')];
    currentRemovalRequest(items);
    expect(items.map((r) => r.id)).toEqual(['a', 'b']);
  });
});

describe('isRemovalBlocked', () => {
  it('blocks a duplicate request while one is open or already approved', () => {
    expect(isRemovalBlocked('pending')).toBe(true);
    expect(isRemovalBlocked('submitted')).toBe(true);
    expect(isRemovalBlocked('approved')).toBe(true);
  });

  it('allows a new request after a rejection', () => {
    expect(isRemovalBlocked('rejected')).toBe(false);
    expect(isRemovalBlocked(null)).toBe(false);
    expect(isRemovalBlocked(undefined)).toBe(false);
  });

  // Terminal outcomes. The owner withdrew the request, or the row already
  // carries its `fulfilled_at` marker — in neither case may the requester be
  // told a request is still outstanding.
  it('does not block on a cancelled or fulfilled request', () => {
    expect(isRemovalBlocked('cancelled')).toBe(false);
    expect(isRemovalBlocked('fulfilled')).toBe(false);
  });
});

describe('cancelRemovalRequest', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function mockFetch({ ok = true, status = 200, body = { id: 'r1', status: 'cancelled' }, detail } = {}) {
    return vi.fn(async () => ({
      ok,
      status,
      json: async () => (ok ? body : { detail }),
    }));
  }

  it('POSTs the owner-only cancel route for the given request', async () => {
    const fetchMock = mockFetch();
    window.fetch = fetchMock;

    await cancelRemovalRequest('r1');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/dftc/removal-requests/r1/cancel');
    expect(init.method).toBe('POST');
  });

  it('surfaces the backend refusal instead of swallowing it', async () => {
    window.fetch = mockFetch({ ok: false, status: 409, detail: 'Grace period has ended' });

    await expect(cancelRemovalRequest('r1')).rejects.toThrow('Grace period has ended');
  });
});

/** Renders the hook above a seeded cache so the query never hits the network. */
function renderRemovalHook(items) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }) =>
    React.createElement(QueryClientProvider, { client }, children);
  if (items) {
    client.setQueryData(['test', 'removalRequests'], { items });
  }
  return renderHook(() => useRemovalRequest(['test', 'removalRequests']), { wrapper });
}

describe('useRemovalRequest', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('surfaces the fulfillment timestamps from the row', () => {
    const fulfilled = {
      ...req('r1', 'approved', '2026-10-01T00:00:00Z'),
      fulfillment_due_at: '2026-10-15T00:00:00Z',
      fulfilled_at: '2026-10-20T00:00:00Z',
    };
    const { result } = renderRemovalHook([fulfilled]);

    expect(result.current.status).toBe('approved');
    expect(result.current.fulfilledAt).toBe('2026-10-20T00:00:00Z');
    expect(result.current.fulfillmentDueAt).toBe('2026-10-15T00:00:00Z');
    // A fulfilled row is terminal: it must not keep blocking a new request.
    expect(result.current.blocked).toBe(false);
  });

  it('keeps an approved-but-unfulfilled request blocking', () => {
    const { result } = renderRemovalHook([
      {
        ...req('r1', 'approved', '2026-10-01T00:00:00Z'),
        fulfillment_due_at: '2026-10-15T00:00:00Z',
      },
    ]);

    expect(result.current.status).toBe('approved');
    expect(result.current.fulfilledAt).toBeNull();
    expect(result.current.blocked).toBe(true);
  });

  it('stops blocking once the owner cancels the request', () => {
    const { result } = renderRemovalHook([
      req('r1', 'cancelled', '2026-10-01T00:00:00Z'),
    ]);

    expect(result.current.status).toBe('cancelled');
    expect(result.current.blocked).toBe(false);
  });

  it('cancel() calls the cancel endpoint for the current request', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ id: 'r1', status: 'cancelled' }),
    }));
    window.fetch = fetchMock;

    const { result } = renderRemovalHook([
      req('r1', 'approved', '2026-10-01T00:00:00Z'),
    ]);
    expect(result.current.current.id).toBe('r1');

    await result.current.cancel();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain('/dftc/removal-requests/r1/cancel');
  });

  it('cancel() is a no-op with no current request', async () => {
    const { result } = renderRemovalHook([]);

    await expect(result.current.cancel()).resolves.toBeNull();
    expect(window.fetch).not.toHaveBeenCalled();
  });
});
